import { apiEndpoints } from "@/lib/api/endpoints";
import type { GatewaySessionResponse } from "@/lib/api/contracts";
import { gatewayRequest } from "@/lib/api/server";
import { jsonResponse, routeErrorResponse, validationResponse } from "@/lib/api/route-response";
import { publicApiConfig } from "@/lib/api/config";
import { clearPendingEmail, getPendingEmail, setSessionCookies } from "@/lib/auth/cookies";
import { createDemoSessionTokens, demoCredentials, demoGatewayUser } from "@/lib/auth/demo";
import { normalizeSessionUser } from "@/lib/auth/session-user";

export const runtime = "nodejs";

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function POST(request: Request) {
  try {
    const pendingEmail = await getPendingEmail();
    if (!pendingEmail) {
      return jsonResponse(
        { code: "OTP_SESSION_EXPIRED", message: "Phiên nhập OTP đã hết hạn. Vui lòng đăng nhập lại." },
        400,
      );
    }

    const body: unknown = await request.json().catch(() => null);
    const otp = isObject(body) && typeof body.otp === "string" ? body.otp.trim() : "";
    if (!/^\d{6}$/.test(otp)) return validationResponse(["otp"]);

    if (publicApiConfig.isDemo) {
      if (otp !== demoCredentials.otp) {
        return jsonResponse({ code: "INVALID_OTP", message: "Mã OTP demo không đúng." }, 400);
      }
      const user = normalizeSessionUser({ ...demoGatewayUser, email: pendingEmail });
      if (!user) return jsonResponse({ code: "FORBIDDEN_ROLE", message: "Tài khoản không có quyền truy cập cổng nhân viên." }, 403);
      const session = createDemoSessionTokens(pendingEmail);
      await setSessionCookies(session.accessToken, session.refreshToken);
      await clearPendingEmail();
      return jsonResponse({ message: "Xác thực demo thành công.", user });
    }

    const result = await gatewayRequest<GatewaySessionResponse>(apiEndpoints.auth.verify, {
      method: "POST",
      body: { email: pendingEmail, otp },
    });
    const user = normalizeSessionUser(result.user);
    if (!user) {
      return jsonResponse({ code: "FORBIDDEN_ROLE", message: "Tài khoản không có quyền truy cập cổng nhân viên." }, 403);
    }

    await setSessionCookies(result.token, result.refreshToken);
    await clearPendingEmail();
    return jsonResponse({ message: result.message, user });
  } catch (error) {
    return routeErrorResponse(error, "Không thể xác thực mã OTP.");
  }
}
