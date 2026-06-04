import { NextRequest, NextResponse } from 'next/server';
import { apiFetch } from '@/lib/api';
import { getAccessToken } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const token = await getAccessToken();
  if (!token) {
    return NextResponse.json({ message: 'Não autenticado' }, { status: 401 });
  }

  const clientId = new URL(req.url).searchParams.get('clientId');
  const query = clientId ? `?clientId=${clientId}` : '';

  try {
    const data = await apiFetch(`/client-form-tokens${query}`, { accessToken: token });
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json(
      { message: e instanceof Error ? e.message : 'Erro' },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  const token = await getAccessToken();
  if (!token) {
    return NextResponse.json({ message: 'Não autenticado' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const data = await apiFetch('/client-form-tokens', {
      method: 'POST',
      accessToken: token,
      body: JSON.stringify(body),
    });
    return NextResponse.json(data, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { message: e instanceof Error ? e.message : 'Erro' },
      { status: 500 },
    );
  }
}
