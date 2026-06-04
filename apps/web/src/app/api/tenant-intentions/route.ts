import { NextResponse } from 'next/server';
import { apiFetch } from '@/lib/api';
import { getAccessToken } from '@/lib/auth';

export async function GET() {
  const token = await getAccessToken();
  if (!token) {
    return NextResponse.json({ message: 'Não autenticado' }, { status: 401 });
  }

  try {
    const data = await apiFetch('/tenant-intentions', { accessToken: token });
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json(
      { message: e instanceof Error ? e.message : 'Erro' },
      { status: 500 },
    );
  }
}
