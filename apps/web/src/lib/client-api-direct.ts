import type { CommitImportResult, ParseImportResponse } from '@/types/client-import';
import { backendErrorMessage, getApiUrl, parseResponseJson } from './api';
import { refreshSession } from './client-auth';

export async function getBearerToken(): Promise<string> {
  let res = await fetch('/api/auth/bearer', { credentials: 'include' });
  if (res.status === 401) {
    const refreshed = await refreshSession();
    if (!refreshed) throw new Error('Não autenticado');
    res = await fetch('/api/auth/bearer', { credentials: 'include' });
  }
  if (!res.ok) throw new Error('Não autenticado');
  const data = (await res.json()) as { token?: string };
  if (!data.token) throw new Error('Não autenticado');
  return data.token;
}

function assertProductionApiUrl(): void {
  const apiUrl = getApiUrl();
  if (
    process.env.NODE_ENV === 'production' &&
    (apiUrl.includes('localhost') || apiUrl.includes('127.0.0.1'))
  ) {
    throw new Error(
      'NEXT_PUBLIC_API_URL não está configurada para produção (ainda aponta para localhost).',
    );
  }
}

function timeoutMessage(status: number, context: 'parse' | 'commit'): string | null {
  if (status !== 504 && status !== 502 && status !== 503) return null;
  if (context === 'parse') {
    return (
      'O processamento do PDF demorou demais no servidor. ' +
      'Confirme timeout de 300s no Cloud Run ou use um PDF com menos páginas.'
    );
  }
  return (
    'O salvamento demorou demais no servidor (timeout). ' +
    'Clique em "Continuar importação" — os clientes já salvos não serão duplicados.'
  );
}

async function fetchApiDirect(
  path: string,
  init: RequestInit,
  context: 'parse' | 'commit',
): Promise<Response> {
  assertProductionApiUrl();
  const apiUrl = getApiUrl();
  const token = await getBearerToken();
  try {
    return await fetch(`${apiUrl}${path}`, {
      ...init,
      headers: {
        ...(init.headers ?? {}),
        Authorization: `Bearer ${token}`,
      },
    });
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    throw new Error(
      `Não foi possível conectar à API em ${apiUrl}. ` +
        `Verifique se a API está online e se WEB_URL na API coincide com este site (CORS). (${detail})`,
    );
  }
}

export async function parseImportFileDirect(
  formData: FormData,
): Promise<ParseImportResponse> {
  const res = await fetchApiDirect('/clients/import/parse', {
    method: 'POST',
    body: formData,
  }, 'parse');
  const data = (await parseResponseJson(res)) as Record<string, unknown>;
  if (!res.ok) {
    throw new Error(
      timeoutMessage(res.status, 'parse') ??
        backendErrorMessage(data, res, 'Falha ao processar arquivo'),
    );
  }
  return data as unknown as ParseImportResponse;
}

export async function commitImportDirect(
  body: unknown,
  signal?: AbortSignal,
): Promise<CommitImportResult> {
  const res = await fetchApiDirect(
    '/clients/import/commit',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal,
    },
    'commit',
  );
  const data = (await parseResponseJson(res)) as Record<string, unknown>;
  if (!res.ok) {
    throw new Error(
      timeoutMessage(res.status, 'commit') ??
        backendErrorMessage(data, res, 'Falha ao importar'),
    );
  }
  return data as unknown as CommitImportResult;
}
