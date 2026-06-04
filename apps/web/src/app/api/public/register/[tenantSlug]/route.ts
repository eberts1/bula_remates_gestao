import { NextRequest, NextResponse } from 'next/server';
import {
  PublicApiError,
  submitPublicRegistration,
  getPublicTenant,
} from '@/lib/public-api';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ tenantSlug: string }> },
) {
  const { tenantSlug } = await params;
  try {
    const data = await getPublicTenant(tenantSlug);
    return NextResponse.json(data);
  } catch (e) {
    if (e instanceof PublicApiError) {
      return NextResponse.json(
        { message: e.message },
        { status: e.status },
      );
    }
    return NextResponse.json(
      { message: e instanceof Error ? e.message : 'Erro' },
      { status: 503 },
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ tenantSlug: string }> },
) {
  const { tenantSlug } = await params;
  try {
    const body = await req.json();
    const data = await submitPublicRegistration(tenantSlug, body);
    return NextResponse.json(data);
  } catch (e) {
    if (e instanceof PublicApiError) {
      return NextResponse.json(
        { message: e.message },
        { status: e.status },
      );
    }
    return NextResponse.json(
      { message: e instanceof Error ? e.message : 'Erro' },
      { status: 503 },
    );
  }
}
