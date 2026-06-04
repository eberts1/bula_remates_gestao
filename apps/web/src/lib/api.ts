function normalizeApiUrl(raw: string): string {
  let url = raw.trim().replace(/\/+$/, '');
  if (!url) return 'http://localhost:4000';
  if (!/^https?:\/\//i.test(url)) {
    url = `https://${url}`;
  }
  return url;
}

const API_URL = normalizeApiUrl(
  process.env.API_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    'http://localhost:4000',
);

export function getApiUrl(): string {
  return API_URL;
}

function apiUrlMisconfiguredMessage(): string | null {
  if (!API_URL.includes('localhost') && !API_URL.includes('127.0.0.1')) {
    if (API_URL.includes('.vercel.app')) {
      return (
        'API_URL aponta para o site da Vercel, não para a API. ' +
        'Defina API_URL e NEXT_PUBLIC_API_URL com a URL pública do Railway (ex.: https://seu-servico.up.railway.app).'
      );
    }
    return null;
  }
  if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
    return (
      'API_URL não está configurada para produção (ainda em localhost). ' +
      'Na Vercel, defina API_URL e NEXT_PUBLIC_API_URL com a URL pública da API no Railway.'
    );
  }
  return null;
}

export async function parseResponseJson(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text.trim()) return {};
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return {};
  }
}

export async function fetchBackend(
  path: string,
  init?: RequestInit,
): Promise<{ res: Response; data: Record<string, unknown> }> {
  const misconfigured = apiUrlMisconfiguredMessage();
  if (misconfigured) {
    throw new Error(misconfigured);
  }

  const url = `${getApiUrl()}${path.startsWith('/') ? path : `/${path}`}`;
  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...init?.headers,
      },
      cache: 'no-store',
    });
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    throw new Error(
      `Não foi possível conectar à API em ${getApiUrl()}. Verifique se o serviço no Railway está online. (${detail})`,
    );
  }

  const data = (await parseResponseJson(res)) as Record<string, unknown>;
  return { res, data };
}

function messageFromZodFlatten(msg: Record<string, unknown>): string | null {
  const formErrors = msg.formErrors;
  if (Array.isArray(formErrors) && formErrors.length > 0) {
    return String(formErrors[0]);
  }
  const fieldErrors = msg.fieldErrors;
  if (fieldErrors && typeof fieldErrors === 'object') {
    for (const [key, values] of Object.entries(
      fieldErrors as Record<string, unknown>,
    )) {
      if (Array.isArray(values) && values.length > 0) {
        return `${key}: ${String(values[0])}`;
      }
    }
  }
  return null;
}

function messageFromData(data: Record<string, unknown>, fallback: string): string {
  const msg = data.message;
  if (Array.isArray(msg)) return String(msg[0] ?? fallback);
  if (typeof msg === 'string' && msg) return msg;
  if (msg && typeof msg === 'object' && !Array.isArray(msg)) {
    return messageFromZodFlatten(msg as Record<string, unknown>) ?? fallback;
  }
  return fallback;
}

export function backendErrorMessage(
  data: Record<string, unknown>,
  res: Response,
  fallback: string,
): string {
  return messageFromData(data, fallback) || res.statusText || fallback;
}

export async function apiFetch(
  path: string,
  options: RequestInit & { accessToken?: string } = {},
) {
  const { accessToken, headers, ...rest } = options;
  const url = `${getApiUrl()}${path.startsWith('/') ? path : `/${path}`}`;

  const res = await fetch(url, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...headers,
    },
    credentials: 'include',
  });

  const data = (await parseResponseJson(res)) as Record<string, unknown>;
  if (!res.ok) {
    throw new Error(backendErrorMessage(data, res, res.statusText));
  }
  return data;
}

export async function apiFetchSafe(
  path: string,
  options: RequestInit & { accessToken?: string } = {},
) {
  try {
    return await apiFetch(path, options);
  } catch (e) {
    if (e instanceof TypeError && e.message === 'fetch failed') {
      throw new Error(
        'Não foi possível conectar à API. Verifique se o servidor está rodando em ' +
          getApiUrl(),
      );
    }
    throw e;
  }
}
