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
  for (const key of ['q', 'strategies']) {
    const value = searchParams.get(key);
    if (value) query.set(key, value);
  }

  try {
    const data = await apiFetch(`/client-hygiene/duplicates?${query}`, {
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
