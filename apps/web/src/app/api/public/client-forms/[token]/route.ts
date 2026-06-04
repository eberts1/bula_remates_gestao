import { NextRequest, NextResponse } from 'next/server';
import { getApiUrl } from '@/lib/api';

async function publicFetch(path: string, init?: RequestInit) {
  const url = `${getApiUrl()}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = (data as { message?: string | string[] }).message;
    const text = Array.isArray(msg) ? msg[0] : msg;
    throw new Error(text ?? res.statusText);
  }
  return data;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  try {
    const data = await publicFetch(
      `/public/client-forms/${encodeURIComponent(token)}`,
    );
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json(
      { message: e instanceof Error ? e.message : 'Erro' },
      { status: 404 },
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  try {
    const body = await req.json();
    const data = await publicFetch(
      `/public/client-forms/${encodeURIComponent(token)}`,
      { method: 'POST', body: JSON.stringify(body) },
    );
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json(
      { message: e instanceof Error ? e.message : 'Erro' },
      { status: 400 },
    );
  }
}
