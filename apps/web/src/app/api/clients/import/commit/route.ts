import { NextRequest, NextResponse } from 'next/server';
import { backendErrorMessage, fetchBackend } from '@/lib/api';
import { getAccessToken } from '@/lib/auth';

/** Importações grandes (PDF 200+ linhas) podem levar mais que o padrão de 10s na Vercel. */
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const token = await getAccessToken();
  if (!token) {
    return NextResponse.json({ message: 'Não autenticado' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { res, data } = await fetchBackend('/clients/import/commit', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      return NextResponse.json(
        { message: backendErrorMessage(data, res, 'Falha ao importar') },
        { status: res.status },
      );
    }
    return NextResponse.json(data);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Erro ao importar';
    const status = message.includes('conectar à API') ? 502 : 500;
    return NextResponse.json({ message }, { status });
  }
}
