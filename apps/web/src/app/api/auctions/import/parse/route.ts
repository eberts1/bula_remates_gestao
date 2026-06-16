import { NextRequest, NextResponse } from 'next/server';
import { getAccessToken } from '@/lib/auth';
import { getApiUrl, parseResponseJson } from '@/lib/api';

export const maxDuration = 60;

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

    const res = await fetch(`${getApiUrl()}/auctions/import/parse`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });

    const data = await parseResponseJson(res);
    if (!res.ok) {
      const msg = (data as { message?: string | string[] }).message;
      return NextResponse.json(
        {
          message: Array.isArray(msg)
            ? msg[0]
            : msg ?? 'Erro ao processar a planilha',
        },
        { status: res.status },
      );
    }

    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json(
      { message: e instanceof Error ? e.message : 'Erro' },
      { status: 500 },
    );
  }
}
