import { NextResponse } from 'next/server';
import { getAccessToken } from '@/lib/auth';

/** Expõe o JWT ao client (mesma origem) para uploads longos direto na API, sem proxy Vercel. */
export async function GET() {
  const token = await getAccessToken();
  if (!token) {
    return NextResponse.json({ message: 'Não autenticado' }, { status: 401 });
  }
  return NextResponse.json(
    { token },
    { headers: { 'Cache-Control': 'no-store, private' } },
  );
}
