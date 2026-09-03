const AUTH_PATHS = ["/dang-nhap", "/dang-ky", "/xac-thuc"];
const APP_ORIGIN = "https://nrapp.local";

export function getSafeReturnPath(value: string | null | undefined) {
  const candidate = value?.trim();
  if (!candidate || !candidate.startsWith("/") || candidate.includes("\\")) {
    return "/trang-chu";
  }

  let target: URL;
  try {
    target = new URL(candidate, APP_ORIGIN);
  } catch {
    return "/trang-chu";
  }
  if (target.origin !== APP_ORIGIN || target.pathname.startsWith("/api/")) return "/trang-chu";
  if (AUTH_PATHS.includes(target.pathname)) return "/trang-chu";

  return `${target.pathname}${target.search}${target.hash}`;
}
