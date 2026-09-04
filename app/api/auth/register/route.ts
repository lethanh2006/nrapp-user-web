import { apiEndpoints } from "@/lib/api/endpoints";
import type { RegisterResponse } from "@/lib/api/contracts";
import { gatewayRequest } from "@/lib/api/server";
import { jsonResponse, routeErrorResponse, validationResponse } from "@/lib/api/route-response";

export const runtime = "nodejs";

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json().catch(() => null);
    if (!isObject(body)) return validationResponse(["username", "email", "password"]);

    const username = typeof body.username === "string" ? body.username.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const invalidFields = [
      ...(username.length < 2 || username.length > 80 ? ["username"] : []),
      ...(!/^\S+@\S+\.\S+$/.test(email) || email.length > 254 ? ["email"] : []),
      ...(password.length < 6 || password.length > 128 ? ["password"] : []),
    ];
    if (invalidFields.length) return validationResponse(invalidFields);

    const result = await gatewayRequest<RegisterResponse>(apiEndpoints.auth.register, {
      method: "POST",
      body: { username, email, password },
    });
    return jsonResponse(result, 201);
  } catch (error) {
    return routeErrorResponse(error, "Không thể tạo tài khoản.");
  }
}
