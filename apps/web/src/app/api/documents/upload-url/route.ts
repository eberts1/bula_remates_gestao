import { NextRequest, NextResponse } from 'next/server';
import { apiFetch } from '@/lib/api';
import { getAccessToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const token = await getAccessToken();
  if (!token) {
    return NextResponse.json({ message: 'Não autenticado' }, { status: 401 });
  }

  const body = await req.json();

  try {
    const data = await apiFetch('/documents/upload-url', {
      method: 'POST',
      accessToken: token,
      body: JSON.stringify(body),
    });
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json(
      { message: e instanceof Error ? e.message : 'Erro' },
      { status: 400 },
    );
  }
}
