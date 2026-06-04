import { NextRequest, NextResponse } from 'next/server';
import { getApiUrl } from '@/lib/api';
import { setAccessToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const res = await fetch(`${getApiUrl()}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    credentials: 'include',
  });

  const data = await res.json();
  if (!res.ok) {
    return NextResponse.json(
      { message: Array.isArray(data.message) ? data.message[0] : data.message ?? 'Erro ao registrar' },
      { status: res.status },
    );
  }

  await setAccessToken(data.accessToken);

  const response = NextResponse.json({
    user: data.user,
    tenant: data.tenant,
  });

  if (data.refreshToken) {
    response.cookies.set('refresh_token', data.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
    });
  }

  return response;
}
