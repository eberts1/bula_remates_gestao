import { NextRequest, NextResponse } from 'next/server';
import { fetchPublicApi, PublicApiError } from '@/lib/public-api';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ tenantSlug: string; id: string }> },
) {
  const { tenantSlug, id } = await params;

  try {
    const data = await fetchPublicApi(
      `/public/register/${encodeURIComponent(tenantSlug)}/documents/${id}/complete`,
      { method: 'POST' },
    );
    return NextResponse.json(data);
  } catch (e) {
    if (e instanceof PublicApiError) {
      return NextResponse.json({ message: e.message }, { status: e.status });
    }
    return NextResponse.json(
      { message: e instanceof Error ? e.message : 'Erro' },
      { status: 503 },
    );
  }
}
