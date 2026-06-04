import { NextRequest, NextResponse } from 'next/server';

import { apiFetch } from '@/lib/api';
import { getAccessToken } from '@/lib/auth';

export async function PATCH(req: NextRequest) {
  const token = await getAccessToken();
  if (!token) {
    return NextResponse.json({ message: 'Não autenticado' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const data = await apiFetch('/client-hygiene/bulk-tags', {
      method: 'PATCH',
      accessToken: token,
      body: JSON.stringify(body),
    });
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json(
      { message: e instanceof Error ? e.message : 'Erro' },
      { status: 500 },
    );
  }
}
