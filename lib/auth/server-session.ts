import "server-only";

import { createHash } from "node:crypto";
import type { GatewaySessionResponse, UserProfileResponse } from "@/lib/api/contracts";
import { apiEndpoints } from "@/lib/api/endpoints";
import { GatewayApiError } from "@/lib/api/errors";
import { gatewayRequest } from "@/lib/api/server";
import { publicApiConfig } from "@/lib/api/config";
import { clearSessionCookies, getSessionTokens, setSessionCookies } from "@/lib/auth/cookies";
import { createDemoSessionTokens, demoGatewayUser, demoRefreshToken, getDemoEmail } from "@/lib/auth/demo";
import { normalizeSessionUser, type SessionUser } from "@/lib/auth/session-user";

export class SessionError extends Error {
  readonly status: 401 | 403;
  readonly code: "SESSION_REQUIRED" | "FORBIDDEN_ROLE";

  constructor(status: 401 | 403, code: "SESSION_REQUIRED" | "FORBIDDEN_ROLE", message: string) {
    super(message);
    this.name = "SessionError";
    this.status = status;
    this.code = code;
  }
}

const refreshFlights = new Map<string, Promise<GatewaySessionResponse>>();

function unauthorized() {
  return new SessionError(401, "SESSION_REQUIRED", "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
}

function forbidden() {
  return new SessionError(403, "FORBIDDEN_ROLE", "Tài khoản không có quyền truy cập cổng nhân viên.");
}

function refreshKey(refreshToken: string) {
  return createHash("sha256").update(refreshToken).digest("hex");
}

function requestRefresh(refreshToken: string) {
  const key = refreshKey(refreshToken);
  const activeRequest = refreshFlights.get(key);
  if (activeRequest) return activeRequest;

  const request = gatewayRequest<GatewaySessionResponse>(apiEndpoints.auth.refresh, {
    method: "POST",
    body: { refreshToken },
  });
  refreshFlights.set(key, request);
  void request.finally(() => {
    setTimeout(() => {
      if (refreshFlights.get(key) === request) refreshFlights.delete(key);
    }, 5_000);
  }).catch(() => undefined);
  return request;
}

async function refreshSession(refreshToken: string) {
  try {
    const session = await requestRefresh(refreshToken);
    const user = normalizeSessionUser(session.user);
    if (!user || !session.token || !session.refreshToken) {
      await clearSessionCookies();
      throw forbidden();
    }
    await setSessionCookies(session.token, session.refreshToken);
    return session.token;
  } catch (error) {
    if (error instanceof SessionError) throw error;
    if (error instanceof GatewayApiError && [400, 401, 403, 404].includes(error.status)) {
      await clearSessionCookies();
      throw unauthorized();
    }
    throw error;
  }
}

async function requestProfile(accessToken: string) {
  const profile = await gatewayRequest<UserProfileResponse>(apiEndpoints.user.me, { accessToken });
  const user = normalizeSessionUser(profile.user);
  if (!user) {
    await clearSessionCookies();
    throw forbidden();
  }
  return user;
}

async function getDemoSession(accessToken: string | null, refreshToken: string | null) {
  let email = getDemoEmail(accessToken);
  if (!email && refreshToken === demoRefreshToken) {
    email = demoGatewayUser.email;
    const session = createDemoSessionTokens(email);
    await setSessionCookies(session.accessToken, session.refreshToken);
  }
  if (!email) {
    await clearSessionCookies();
    throw unauthorized();
  }

  const user = normalizeSessionUser({ ...demoGatewayUser, email });
  if (!user) throw forbidden();
  return user;
}

export async function getCurrentSessionUser(): Promise<SessionUser> {
  const { accessToken, refreshToken } = await getSessionTokens();
  if (publicApiConfig.isDemo) return getDemoSession(accessToken, refreshToken);

  if (!accessToken && !refreshToken) throw unauthorized();

  let activeAccessToken = accessToken;
  if (!activeAccessToken && refreshToken) activeAccessToken = await refreshSession(refreshToken);
  if (!activeAccessToken) throw unauthorized();

  try {
    return await requestProfile(activeAccessToken);
  } catch (error) {
    if (!(error instanceof GatewayApiError) || error.status !== 401 || !refreshToken) {
      if (error instanceof GatewayApiError && [401, 403, 404].includes(error.status)) {
        await clearSessionCookies();
        throw unauthorized();
      }
      throw error;
    }
  }

  const renewedAccessToken = await refreshSession(refreshToken);
  try {
    return await requestProfile(renewedAccessToken);
  } catch (error) {
    if (error instanceof GatewayApiError && [401, 403, 404].includes(error.status)) {
      await clearSessionCookies();
      throw unauthorized();
    }
    throw error;
  }
}
