import { NextRequest, NextResponse } from 'next/server';

import { apiFetch } from '@/lib/api';
import { getAccessToken } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const token = await getAccessToken();
  if (!token) {
    return NextResponse.json({ message: 'Não autenticado' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const state = searchParams.get('state');
  if (!state) return NextResponse.json({ items: [] });

  const query = new URLSearchParams({ state });
  const q = searchParams.get('q');
  if (q) query.set('q', q);

  try {
    const data = await apiFetch(`/geo/cities?${query}`, { accessToken: token });
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json(
      { message: e instanceof Error ? e.message : 'Erro' },
      { status: 500 },
    );
  }
}
