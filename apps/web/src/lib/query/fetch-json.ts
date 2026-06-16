import { refreshSession } from '@/lib/client-auth';

export class FetchJsonError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'FetchJsonError';
  }
}

async function fetchWithSession(
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

export async function fetchJson<T>(
  url: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetchWithSession(url, init);
  const data = await res.json();

  if (!res.ok) {
    const message =
      typeof data.message === 'string'
        ? data.message
        : 'Erro na requisição';
    throw new FetchJsonError(message, res.status);
  }

  return data as T;
}
