import { getApiUrl } from './api';
import { getAccessToken } from './auth';

export async function apiUpload(
  path: string,
  formData: FormData,
): Promise<unknown> {
  const token = await getAccessToken();
  if (!token) throw new Error('Não autenticado');

  const url = `${getApiUrl()}${path.startsWith('/') ? path : `/${path}`}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
    credentials: 'include',
  });

  let data: unknown = {};
  try {
    data = await res.json();
  } catch {
    /* non-json */
  }
  if (!res.ok) {
    const msg = (data as { message?: string | string[] }).message;
    const text = Array.isArray(msg) ? msg[0] : msg;
    throw new Error(text ?? res.statusText);
  }
  return data;
}
