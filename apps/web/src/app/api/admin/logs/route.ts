import { NextRequest, NextResponse } from 'next/server';
import { apiFetch } from '@/lib/api';
import { getAccessToken } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const token = await getAccessToken();
  if (!token) {
    return NextResponse.json({ message: 'Não autenticado' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const query = new URLSearchParams();
  for (const key of ['tenantId', 'userId', 'action', 'q', 'from', 'to', 'page', 'limit']) {
    const val = searchParams.get(key);
    if (val) query.set(key, val);
  }
  if (!query.has('page')) query.set('page', '1');
  if (!query.has('limit')) query.set('limit', '30');

  try {
    const data = await apiFetch(`/admin/logs?${query}`, { accessToken: token });
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json(
      { message: e instanceof Error ? e.message : 'Erro' },
      { status: 500 },
    );
  }
}
