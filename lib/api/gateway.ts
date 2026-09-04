import { apiRequest, type ApiRequestOptions } from "@/lib/api/client";

type QueryValue = string | number | boolean | null | undefined;

export function gatewayPath(path: string, query?: Record<string, QueryValue>) {
  const cleanPath = path.replace(/^\/+/, "");
  const search = new URLSearchParams();
  Object.entries(query ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") search.set(key, String(value));
  });
  const suffix = search.toString();
  return `/api/gateway/${cleanPath}${suffix ? `?${suffix}` : ""}`;
}

export function gatewayApi<T>(
  path: string,
  options: ApiRequestOptions = {},
) {
  return apiRequest<T>(gatewayPath(path), options);
}
