import type { GatewayUser } from "@/lib/api/contracts";

export const demoCredentials = {
  email: "minhanh@hdg.vn",
  password: "HDG@2026",
  otp: "123456",
} as const;

export const demoGatewayUser: GatewayUser = {
  _id: "user-minh-anh",
  name: "Lê Minh Anh",
  username: "Lê Minh Anh",
  email: demoCredentials.email,
  role: "user",
};

const DEMO_ACCESS_PREFIX = "nrapp-demo-access-token.";
export const demoRefreshToken = "nrapp-demo-refresh-token";

export function createDemoSessionTokens(email: string) {
  return {
    accessToken: `${DEMO_ACCESS_PREFIX}${encodeURIComponent(email.trim().toLowerCase())}`,
    refreshToken: demoRefreshToken,
  };
}

export function getDemoEmail(accessToken: string | null) {
  if (!accessToken?.startsWith(DEMO_ACCESS_PREFIX)) return null;
  try {
    const email = decodeURIComponent(accessToken.slice(DEMO_ACCESS_PREFIX.length));
    return /^\S+@\S+\.\S+$/.test(email) ? email : null;
  } catch {
    return null;
  }
}
