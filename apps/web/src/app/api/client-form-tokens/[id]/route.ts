import { NextRequest, NextResponse } from 'next/server';
import { apiFetch } from '@/lib/api';
import { getAccessToken } from '@/lib/auth';

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const token = await getAccessToken();
  if (!token) {
    return NextResponse.json({ message: 'Não autenticado' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const data = await apiFetch(`/client-form-tokens/${id}`, {
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
