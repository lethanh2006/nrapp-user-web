import type { GatewayUser } from "@/lib/api/contracts";

export const userAreaRoles = ["user", "vip"] as const;
export type UserAreaRole = (typeof userAreaRoles)[number];

export type SessionUser = {
  id: string;
  name: string;
  username?: string;
  email: string;
  role: UserAreaRole;
};

export function normalizeSessionUser(raw: GatewayUser): SessionUser | null {
  const id = String(raw._id ?? "").trim();
  const email = String(raw.email ?? "").trim().toLowerCase();
  const role = String(raw.role ?? "").trim().toLowerCase();
  if (!id || !email || !userAreaRoles.includes(role as UserAreaRole)) return null;

  const username = typeof raw.username === "string" ? raw.username.trim() : "";
  const explicitName = typeof raw.name === "string" ? raw.name.trim() : "";

  return {
    id,
    name: explicitName || username || email.split("@")[0] || "Người dùng",
    ...(username ? { username } : {}),
    email,
    role: role as UserAreaRole,
  };
}

export function getUserInitials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return "ND";
  return words.slice(-2).map((word) => word[0]?.toLocaleUpperCase("vi") ?? "").join("");
}
