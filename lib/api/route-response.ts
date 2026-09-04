import "server-only";

import { GatewayApiError, GatewayUnavailableError } from "@/lib/api/errors";
import { SessionError } from "@/lib/auth/server-session";

export function jsonResponse(payload: unknown, status = 200) {
  return Response.json(payload, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export function validationResponse(fields: string[]) {
  return jsonResponse(
    {
      code: "VALIDATION_ERROR",
      message: "Dữ liệu không hợp lệ. Vui lòng kiểm tra lại.",
      details: { fields },
    },
    422,
  );
}

export function routeErrorResponse(error: unknown, fallback: string) {
  if (error instanceof SessionError) {
    return jsonResponse({ code: error.code, message: error.message }, error.status);
  }
  if (error instanceof GatewayApiError) {
    return jsonResponse(
      {
        code: error.code ?? `HTTP_${error.status}`,
        message: error.message,
        ...(error.fields.length ? { details: { fields: error.fields } } : {}),
        ...(error.errorId ? { errorId: error.errorId } : {}),
      },
      error.status,
    );
  }
  if (error instanceof GatewayUnavailableError) {
    return jsonResponse({ code: error.code, message: error.message }, error.status);
  }
  return jsonResponse({ code: "INTERNAL_ERROR", message: fallback }, 500);
}
