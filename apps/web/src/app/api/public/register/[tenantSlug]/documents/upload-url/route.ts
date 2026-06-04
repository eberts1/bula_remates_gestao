import { NextRequest, NextResponse } from 'next/server';
import { fetchPublicApi, PublicApiError } from '@/lib/public-api';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ tenantSlug: string }> },
) {
  const { tenantSlug } = await params;

  try {
    const body = await req.json();
    const data = await fetchPublicApi(
      `/public/register/${encodeURIComponent(tenantSlug)}/documents/upload-url`,
      { method: 'POST', body: JSON.stringify(body) },
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
