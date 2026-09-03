import "server-only";

import { cookies } from "next/headers";

export const authCookieNames = {
  accessToken: "nrapp.access_token",
  refreshToken: "nrapp.refresh_token",
  pendingEmail: "nrapp.pending_email",
} as const;

const ACCESS_TOKEN_MAX_AGE = 7 * 24 * 60 * 60;
const REFRESH_TOKEN_MAX_AGE = 30 * 24 * 60 * 60;
const PENDING_EMAIL_MAX_AGE = 5 * 60;

function shouldUseSecureCookies() {
  const configured = process.env.NRAPP_COOKIE_SECURE?.trim().toLowerCase();
  if (configured === "true") return true;
  if (configured === "false") return false;
  return process.env.NODE_ENV === "production";
}

function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: shouldUseSecureCookies(),
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}

export async function setPendingEmail(email: string) {
  const store = await cookies();
  store.set(authCookieNames.pendingEmail, email, cookieOptions(PENDING_EMAIL_MAX_AGE));
}

export async function getPendingEmail() {
  const store = await cookies();
  return store.get(authCookieNames.pendingEmail)?.value ?? null;
}

export async function clearPendingEmail() {
  const store = await cookies();
  store.set(authCookieNames.pendingEmail, "", cookieOptions(0));
}

export async function setSessionCookies(accessToken: string, refreshToken: string) {
  const store = await cookies();
  store.set(authCookieNames.accessToken, accessToken, cookieOptions(ACCESS_TOKEN_MAX_AGE));
  store.set(authCookieNames.refreshToken, refreshToken, cookieOptions(REFRESH_TOKEN_MAX_AGE));
}

export async function getSessionTokens() {
  const store = await cookies();
  return {
    accessToken: store.get(authCookieNames.accessToken)?.value ?? null,
    refreshToken: store.get(authCookieNames.refreshToken)?.value ?? null,
  };
}

export async function clearSessionCookies() {
  const store = await cookies();
  store.set(authCookieNames.accessToken, "", cookieOptions(0));
  store.set(authCookieNames.refreshToken, "", cookieOptions(0));
  store.set(authCookieNames.pendingEmail, "", cookieOptions(0));
}
