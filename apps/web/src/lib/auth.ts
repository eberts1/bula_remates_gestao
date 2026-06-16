import { cookies } from 'next/headers';
import type { NextResponse } from 'next/server';

export const ACCESS_COOKIE = 'access_token';
export const REFRESH_COOKIE = 'refresh_token';

const ACCESS_MAX_AGE = 15 * 60;
const REFRESH_MAX_AGE = 7 * 24 * 60 * 60;

function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

export function accessTokenCookieOptions(maxAge = ACCESS_MAX_AGE) {
  return {
    httpOnly: true,
    secure: isProduction(),
    sameSite: 'lax' as const,
    path: '/',
    maxAge,
  };
}

export function refreshTokenCookieOptions(maxAge = REFRESH_MAX_AGE) {
  return {
    httpOnly: true,
    secure: isProduction(),
    sameSite: 'lax' as const,
    path: '/',
    maxAge,
  };
}

export async function getAccessToken(): Promise<string | undefined> {
  const store = await cookies();
  return store.get(ACCESS_COOKIE)?.value;
}

export async function setAccessToken(token: string) {
  const store = await cookies();
  store.set(ACCESS_COOKIE, token, accessTokenCookieOptions());
}

export function applyAccessTokenCookie(response: NextResponse, token: string) {
  response.cookies.set(ACCESS_COOKIE, token, accessTokenCookieOptions());
}

export function applyRefreshTokenCookie(response: NextResponse, token: string) {
  response.cookies.set(REFRESH_COOKIE, token, refreshTokenCookieOptions());
}

export async function clearAccessToken() {
  const store = await cookies();
  store.delete(ACCESS_COOKIE);
}
