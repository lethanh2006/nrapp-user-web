import { apiEndpoints } from "@/lib/api/endpoints";
import type { LoginResponse } from "@/lib/api/contracts";
import { gatewayRequest } from "@/lib/api/server";
import { jsonResponse, routeErrorResponse, validationResponse } from "@/lib/api/route-response";
import { publicApiConfig } from "@/lib/api/config";
import { setPendingEmail } from "@/lib/auth/cookies";

export const runtime = "nodejs";

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json().catch(() => null);
    if (!isObject(body)) return validationResponse(["email", "password"]);

    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const invalidFields = [
      ...(!/^\S+@\S+\.\S+$/.test(email) || email.length > 254 ? ["email"] : []),
      ...(password.length < 6 || password.length > 128 ? ["password"] : []),
    ];
    if (invalidFields.length) return validationResponse(invalidFields);

    if (publicApiConfig.isDemo) {
      await setPendingEmail(email);
      return jsonResponse({ message: "Mã OTP demo đã sẵn sàng." });
    }

    const result = await gatewayRequest<LoginResponse>(apiEndpoints.auth.login, {
      method: "POST",
      body: { email, password },
    });
    await setPendingEmail(result.email || email);
    return jsonResponse({ message: result.message });
  } catch (error) {
    return routeErrorResponse(error, "Không thể bắt đầu đăng nhập.");
  }
}
