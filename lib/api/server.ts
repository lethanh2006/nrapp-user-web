import "server-only";

import { randomUUID } from "node:crypto";
import { GatewayApiError, GatewayUnavailableError } from "@/lib/api/errors";

export type GatewayRequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  accessToken?: string;
  timeoutMs?: number;
};

function getGatewayConfig() {
  const baseUrl = (process.env.NRAPP_API_URL?.trim() || "https://api-vps.thanhlelmtp2006.id.vn/api")
    .replace(/\/+$/, "");

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(baseUrl);
  } catch {
    throw new GatewayUnavailableError("NRAPP_API_URL không phải là một URL hợp lệ.");
  }
  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    throw new GatewayUnavailableError("NRAPP_API_URL chỉ hỗ trợ giao thức HTTP hoặc HTTPS.");
  }

  const rawTimeout = Number(process.env.NRAPP_API_TIMEOUT_MS ?? 10_000);
  const timeoutMs = Number.isFinite(rawTimeout)
    ? Math.min(Math.max(rawTimeout, 1_000), 60_000)
    : 10_000;

  return { baseUrl, timeoutMs };
}

async function readPayload(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return { message: text };
  }
}

export async function gatewayRequest<T>(
  path: string,
  { method = "GET", body, accessToken, timeoutMs: requestTimeoutMs }: GatewayRequestOptions = {},
): Promise<T> {
  const { baseUrl, timeoutMs: defaultTimeoutMs } = getGatewayConfig();
  const timeoutMs = Number.isFinite(requestTimeoutMs)
    ? Math.min(Math.max(Number(requestTimeoutMs), 1_000), 60_000)
    : defaultTimeoutMs;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const headers = new Headers({
      Accept: "application/json",
      "x-request-id": randomUUID(),
    });
    if (body !== undefined) headers.set("Content-Type", "application/json");
    if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);

    const response = await fetch(`${baseUrl}/${path.replace(/^\/+/, "")}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
      redirect: "manual",
      signal: controller.signal,
    });
    const payload = await readPayload(response);
    if (!response.ok) throw new GatewayApiError(response.status, payload);
    return payload as T;
  } catch (error) {
    if (error instanceof GatewayApiError || error instanceof GatewayUnavailableError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      throw new GatewayUnavailableError("Kết nối đến Gateway đã quá thời gian.");
    }
    throw new GatewayUnavailableError();
  } finally {
    clearTimeout(timeout);
  }
}
