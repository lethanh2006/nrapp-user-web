export const publicApiConfig = {
  socketUrl: process.env.NEXT_PUBLIC_SOCKET_URL?.trim().replace(/\/+$/, "") ?? "",
  socketPath: process.env.NEXT_PUBLIC_SOCKET_PATH?.trim() || "/socket.io",
} as const;
