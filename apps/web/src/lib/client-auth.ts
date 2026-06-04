/** Renova o access token usando o refresh token (cookie httpOnly). */
export async function refreshSession(): Promise<boolean> {
  try {
    const res = await fetch('/api/auth/refresh', {
      method: 'POST',
      credentials: 'include',
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** fetch com retry automático após refresh em 401. */
export async function fetchAuthed(
  url: string,
  init?: RequestInit,
): Promise<Response> {
  let res = await fetch(url, { ...init, credentials: 'include' });
  if (res.status === 401) {
    const refreshed = await refreshSession();
    if (refreshed) {
      res = await fetch(url, { ...init, credentials: 'include' });
    }
  }
  return res;
}
