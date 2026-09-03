const AUTH_PATHS = ["/dang-nhap", "/dang-ky", "/xac-thuc"];

export function getSafeReturnPath(value: string | null | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/api/")) {
    return "/trang-chu";
  }
  if (AUTH_PATHS.some((path) => value === path || value.startsWith(`${path}?`))) {
    return "/trang-chu";
  }
  return value;
}
