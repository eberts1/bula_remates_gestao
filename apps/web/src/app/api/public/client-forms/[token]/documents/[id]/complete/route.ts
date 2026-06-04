import { NextRequest, NextResponse } from 'next/server';
import { getApiUrl } from '@/lib/api';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string; id: string }> },
) {
  const { token, id } = await params;
  const url = `${getApiUrl()}/public/client-forms/${encodeURIComponent(token)}/documents/${id}/complete`;

  try {
    const res = await fetch(url, { method: 'POST' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = (data as { message?: string }).message;
      throw new Error(msg ?? res.statusText);
    }
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json(
      { message: e instanceof Error ? e.message : 'Erro' },
      { status: 400 },
    );
  }
}
