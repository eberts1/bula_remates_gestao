import { NextRequest, NextResponse } from 'next/server';
import { apiFetch } from '@/lib/api';
import { getAccessToken } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const token = await getAccessToken();
  if (!token) {
    return NextResponse.json({ message: 'Não autenticado' }, { status: 401 });
  }

  const tenantId = new URL(req.url).searchParams.get('tenantId');
  if (!tenantId) {
    return NextResponse.json({ message: 'tenantId obrigatório' }, { status: 400 });
  }

  try {
    const data = await apiFetch(`/admin/collaborators?tenantId=${tenantId}`, {
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
