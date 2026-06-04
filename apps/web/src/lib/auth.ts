import { cookies } from 'next/headers';

const ACCESS_COOKIE = 'access_token';

export async function getAccessToken(): Promise<string | undefined> {
  const store = await cookies();
  return store.get(ACCESS_COOKIE)?.value;
}

export async function setAccessToken(token: string) {
  const store = await cookies();
  store.set(ACCESS_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 15 * 60,
  });
}

export async function clearAccessToken() {
  const store = await cookies();
  store.delete(ACCESS_COOKIE);
}
