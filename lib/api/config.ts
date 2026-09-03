export type AppMode = "demo" | "live";

const configuredMode = process.env.NEXT_PUBLIC_APP_MODE?.trim().toLowerCase();
const mode: AppMode = configuredMode === "live" ? "live" : "demo";

export const publicApiConfig = {
  mode,
  isDemo: mode === "demo",
  socketUrl: process.env.NEXT_PUBLIC_SOCKET_URL?.trim().replace(/\/+$/, "") ?? "",
  socketPath: process.env.NEXT_PUBLIC_SOCKET_PATH?.trim() || "/socket.io",
} as const;
