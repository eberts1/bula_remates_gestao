import { NextRequest, NextResponse } from 'next/server';

import { apiFetch } from '@/lib/api';
import { getAccessToken } from '@/lib/auth';

type Params = { params: Promise<{ id: string; clientId: string }> };

export async function DELETE(_req: NextRequest, { params }: Params) {
  const token = await getAccessToken();
  if (!token) {
    return NextResponse.json({ message: 'Não autenticado' }, { status: 401 });
  }

  const { id, clientId } = await params;

  try {
    const data = await apiFetch(`/auctions/${id}/matches/${clientId}`, {
      method: 'DELETE',
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
