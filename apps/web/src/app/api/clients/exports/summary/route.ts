import { NextResponse } from 'next/server';

import { apiFetch } from '@/lib/api';
import { getAccessToken } from '@/lib/auth';

export async function GET() {
  const token = await getAccessToken();

  if (!token) {
    return NextResponse.json({ message: 'Não autenticado' }, { status: 401 });
  }

  const data = await apiFetch('/clients/exports/summary', { accessToken: token });
  return NextResponse.json(data);
}
