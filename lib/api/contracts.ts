export type GatewayRole =
  | "admin"
  | "manager"
  | "chef"
  | "cashier"
  | "waiter"
  | "user"
  | "vip"
  | (string & {});

export type GatewayUser = {
  _id: string;
  name?: string;
  username?: string;
  email: string;
  role: GatewayRole;
};

export type MessageResponse = {
  message: string;
};

export type RegisterRequest = {
  username: string;
  email: string;
  password: string;
};

export type RegisterResponse = MessageResponse & {
  userId: string;
};

export type LoginRequest = {
  email: string;
  password: string;
};

export type LoginResponse = MessageResponse & {
  email: string;
};

export type GoogleLoginRequest = {
  token: string;
};

export type VerifyOtpRequest = {
  email: string;
  otp: string;
};

export type GatewaySessionResponse = MessageResponse & {
  token: string;
  refreshToken: string;
  user: GatewayUser;
};

export type UserProfileResponse = {
  user: GatewayUser;
};
