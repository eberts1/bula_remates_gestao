import { getApiUrl } from './api';

const MAX_ATTEMPTS = 3;
const RETRY_MS = 1200;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class PublicApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'PublicApiError';
  }
}

export async function fetchPublicApi<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const url = `${getApiUrl()}${path.startsWith('/') ? path : `/${path}`}`;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(url, {
        ...init,
        headers: {
          'Content-Type': 'application/json',
          ...init?.headers,
        },
        cache: 'no-store',
      });

      let data: unknown = {};
      try {
        data = await res.json();
      } catch {
        /* não-JSON */
      }

      if (!res.ok) {
        const msg = (data as { message?: string | string[] }).message;
        const text = Array.isArray(msg) ? msg[0] : msg;
        throw new PublicApiError(
          text ?? res.statusText,
          res.status,
        );
      }

      return data as T;
    } catch (e) {
      if (e instanceof PublicApiError) {
        throw e;
      }

      lastError = e instanceof Error ? e : new Error(String(e));
      const isNetwork =
        lastError.message === 'fetch failed' ||
        lastError.name === 'TypeError';

      if (!isNetwork || attempt === MAX_ATTEMPTS) {
        throw new PublicApiError(
          'Serviço temporariamente indisponível. Aguarde alguns segundos e recarregue a página.',
          503,
        );
      }

      await sleep(RETRY_MS);
    }
  }

  throw lastError ?? new Error('Erro desconhecido');
}

export async function getPublicTenant(tenantSlug: string) {
  return fetchPublicApi<{ tenantName: string; tenantSlug: string }>(
    `/public/register/${encodeURIComponent(tenantSlug)}`,
  );
}

export async function submitPublicRegistration(
  tenantSlug: string,
  body: unknown,
) {
  return fetchPublicApi<{ clientId: string; message: string }>(
    `/public/register/${encodeURIComponent(tenantSlug)}`,
    { method: 'POST', body: JSON.stringify(body) },
  );
}
