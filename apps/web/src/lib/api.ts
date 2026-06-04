const API_URL = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export function getApiUrl(): string {
  return API_URL;
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

  let data: unknown = {};
  try {
    data = await res.json();
  } catch {
    /* resposta não-JSON */
  }
  if (!res.ok) {
    const msg = (data as { message?: string | string[] }).message;
    const text = Array.isArray(msg) ? msg[0] : msg;
    throw new Error(text ?? res.statusText);
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
