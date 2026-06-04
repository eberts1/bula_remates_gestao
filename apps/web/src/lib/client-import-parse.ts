import type { ParseImportResponse } from '@/types/client-import';
import { backendErrorMessage, getApiUrl, parseResponseJson } from './api';
import { refreshSession } from './client-auth';

async function getBearerToken(): Promise<string> {
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

function parseTimeoutMessage(status: number): string | null {
  if (status === 504 || status === 502 || status === 503) {
    return (
      'O processamento do PDF demorou demais no servidor. ' +
      'Confirme timeout de 300s no Cloud Run ou use um PDF com menos páginas.'
    );
  }
  return null;
}

/**
 * Envia o arquivo direto para a API (Cloud Run), evitando o limite de tempo
 * das Serverless Functions da Vercel (~10–60s).
 */
export async function parseImportFileDirect(
  formData: FormData,
): Promise<ParseImportResponse> {
  const apiUrl = getApiUrl();
  if (
    process.env.NODE_ENV === 'production' &&
    (apiUrl.includes('localhost') || apiUrl.includes('127.0.0.1'))
  ) {
    throw new Error(
      'NEXT_PUBLIC_API_URL não está configurada para produção (ainda aponta para localhost).',
    );
  }

  const token = await getBearerToken();

  let res: Response;
  try {
    res = await fetch(`${apiUrl}/clients/import/parse`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    throw new Error(
      `Não foi possível conectar à API em ${apiUrl}. ` +
        `Verifique se a API está online e se WEB_URL na API coincide com este site (CORS). (${detail})`,
    );
  }

  const data = (await parseResponseJson(res)) as Record<string, unknown>;
  if (!res.ok) {
    throw new Error(
      parseTimeoutMessage(res.status) ??
        backendErrorMessage(data, res, 'Falha ao processar arquivo'),
    );
  }
  return data as unknown as ParseImportResponse;
}
