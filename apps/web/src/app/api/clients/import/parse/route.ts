import { NextRequest, NextResponse } from 'next/server';
import { getAccessToken } from '@/lib/auth';
import { getApiUrl, parseResponseJson } from '@/lib/api';

/** PDFs ETB com centenas de páginas podem levar 1–2 min só na extração de texto. */
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const token = await getAccessToken();
  if (!token) {
    return NextResponse.json({ message: 'Não autenticado' }, { status: 401 });
  }

  try {
    const incoming = await req.formData();
    const formData = new FormData();
    const file = incoming.get('file');
    if (file && typeof file === 'object' && 'arrayBuffer' in file) {
      const blob = file as Blob & { name?: string };
      const name =
        'name' in blob && typeof blob.name === 'string' ? blob.name : 'upload';
      formData.append('file', blob, name);
    }
    const sourceHints = incoming.get('sourceHints');
    if (typeof sourceHints === 'string') {
      formData.append('sourceHints', sourceHints);
    }
    const columnMapping = incoming.get('columnMapping');
    if (typeof columnMapping === 'string') {
      formData.append('columnMapping', columnMapping);
    }

    const res = await fetch(`${getApiUrl()}/clients/import/parse`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });

    const data = await parseResponseJson(res);
    if (!res.ok) {
      const msg = (data as { message?: string | string[] }).message;
      const fallback =
        res.status === 504 || res.status === 502
          ? 'O processamento do PDF demorou demais. Tente um arquivo menor (ex.: só as páginas necessárias) ou tente novamente em instantes.'
          : 'Erro ao processar o arquivo';
      return NextResponse.json(
        { message: Array.isArray(msg) ? msg[0] : msg ?? fallback },
        { status: res.status },
      );
    }
    return NextResponse.json(data);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Erro';
    const friendly =
      /upstream|timed out|timeout|aborted/i.test(message)
        ? 'O processamento do PDF demorou demais. Tente um arquivo menor ou aguarde e tente novamente.'
        : message;
    return NextResponse.json({ message: friendly }, { status: 500 });
  }
}
