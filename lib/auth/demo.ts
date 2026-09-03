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

export const demoSessionTokens = {
  accessToken: "nrapp-demo-access-token",
  refreshToken: "nrapp-demo-refresh-token",
} as const;
