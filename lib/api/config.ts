const normalizedApiBaseUrl = process.env.NEXT_PUBLIC_API_URL?.trim().replace(/\/+$/, "") ?? "";

export const publicApiConfig = {
  baseUrl: normalizedApiBaseUrl,
  timeoutMs: Number(process.env.NEXT_PUBLIC_API_TIMEOUT_MS ?? 10_000),
  socketUrl: process.env.NEXT_PUBLIC_SOCKET_URL?.trim().replace(/\/+$/, "") ?? "",
  socketPath: process.env.NEXT_PUBLIC_SOCKET_PATH?.trim() || "/socket.io",
};

export function buildApiUrl(path: string) {
  if (!publicApiConfig.baseUrl) {
    throw new Error("NEXT_PUBLIC_API_URL chưa được cấu hình.");
  }
  return `${publicApiConfig.baseUrl}/${path.replace(/^\/+/, "")}`;
}
