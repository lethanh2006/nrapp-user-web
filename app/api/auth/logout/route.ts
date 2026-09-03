import { jsonResponse } from "@/lib/api/route-response";
import { clearSessionCookies } from "@/lib/auth/cookies";

export const runtime = "nodejs";

async function logout() {
  await clearSessionCookies();
  return jsonResponse({ message: "Đã đăng xuất khỏi thiết bị này." });
}

export const POST = logout;
export const DELETE = logout;
