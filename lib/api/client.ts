export class ApiClientError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly fields: string[];

  constructor(status: number, payload: unknown, fallback: string) {
    const value = typeof payload === "object" && payload !== null
      ? payload as { message?: unknown; code?: unknown; details?: { fields?: unknown } }
      : undefined;
    const message = typeof value?.message === "string" && value.message.trim()
      ? value.message.trim()
      : fallback;
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.code = typeof value?.code === "string" ? value.code : undefined;
    this.fields = Array.isArray(value?.details?.fields)
      ? value.details.fields.filter((field): field is string => typeof field === "string")
      : [];
  }
}

export type ApiRequestOptions = Omit<RequestInit, "body"> & {
  json?: unknown;
};

export async function apiRequest<T>(path: string, { json, ...init }: ApiRequestOptions = {}) {
  if (!path.startsWith("/api/")) {
    throw new Error("apiRequest chỉ chấp nhận đường dẫn API cùng nguồn.");
  }

  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (json !== undefined) headers.set("Content-Type", "application/json");

  let response: Response;
  try {
    response = await fetch(path, {
      ...init,
      headers,
      body: json === undefined ? undefined : JSON.stringify(json),
      cache: "no-store",
      credentials: "same-origin",
    });
  } catch {
    throw new ApiClientError(0, null, "Không thể kết nối đến máy chủ.");
  }

  const text = await response.text();
  let payload: unknown;
  try {
    payload = text ? JSON.parse(text) as unknown : undefined;
  } catch {
    payload = text ? { message: text } : undefined;
  }

  if (!response.ok) {
    throw new ApiClientError(response.status, payload, `Yêu cầu thất bại (${response.status}).`);
  }
  return payload as T;
}
