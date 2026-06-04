import { NextRequest, NextResponse } from 'next/server';
import { apiFetch } from '@/lib/api';
import { getAccessToken } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const token = await getAccessToken();
  if (!token) {
    return NextResponse.json({ message: 'Não autenticado' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const page = searchParams.get('page') ?? '1';
  const limit = searchParams.get('limit') ?? '20';
  const clientId = searchParams.get('clientId');
  const query = new URLSearchParams({ page, limit });
  if (clientId) query.set('clientId', clientId);

  try {
    const data = await apiFetch(`/documents?${query}`, {
      accessToken: token,
    });
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json(
      { message: e instanceof Error ? e.message : 'Erro' },
      { status: 500 },
    );
  }
}
