import { jsonResponse, routeErrorResponse } from "@/lib/api/route-response";
import { getCurrentSessionUser, SessionError } from "@/lib/auth/server-session";

export const runtime = "nodejs";

export async function GET() {
  try {
    const user = await getCurrentSessionUser();
    return jsonResponse({ user });
  } catch (error) {
    if (error instanceof SessionError) {
      return jsonResponse({ code: error.code, message: error.message }, error.status);
    }
    return routeErrorResponse(error, "Không thể kiểm tra phiên đăng nhập.");
  }
}
