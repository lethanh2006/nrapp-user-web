import { apiEndpoints } from "@/lib/api/endpoints";
import type { GatewaySessionResponse } from "@/lib/api/contracts";
import { gatewayRequest } from "@/lib/api/server";
import { jsonResponse, routeErrorResponse, validationResponse } from "@/lib/api/route-response";
import { clearPendingEmail, setSessionCookies } from "@/lib/auth/cookies";
import { normalizeSessionUser } from "@/lib/auth/session-user";

export const runtime = "nodejs";

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json().catch(() => null);
    const token = isObject(body) && typeof body.token === "string" ? body.token.trim() : "";
    if (!token || token.length > 8_192) return validationResponse(["token"]);

    const result = await gatewayRequest<GatewaySessionResponse>(apiEndpoints.auth.loginGoogle, {
      method: "POST",
      body: { token },
    });
    const user = normalizeSessionUser(result.user);
    if (!user) {
      return jsonResponse(
        { code: "FORBIDDEN_ROLE", message: "Tài khoản Google không có quyền truy cập cổng nhân viên." },
        403,
      );
    }
    if (!result.token || !result.refreshToken) {
      return jsonResponse(
        { code: "INVALID_SESSION", message: "Máy chủ không trả về phiên đăng nhập hợp lệ." },
        502,
      );
    }

    await setSessionCookies(result.token, result.refreshToken);
    await clearPendingEmail();
    return jsonResponse({ message: result.message, user });
  } catch (error) {
    return routeErrorResponse(error, "Không thể đăng nhập bằng Google.");
  }
}
