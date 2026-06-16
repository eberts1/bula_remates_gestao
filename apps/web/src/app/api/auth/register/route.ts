import { NextRequest, NextResponse } from 'next/server';
import { backendErrorMessage, fetchBackend } from '@/lib/api';
import { applyAccessTokenCookie, applyRefreshTokenCookie } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { res, data } = await fetchBackend('/auth/register', {
      method: 'POST',
      body: JSON.stringify(body),
      credentials: 'include',
    });

    if (!res.ok) {
      return NextResponse.json(
        { message: backendErrorMessage(data, res, 'Erro ao registrar') },
        { status: res.status },
      );
    }

    const accessToken = data.accessToken;
    if (typeof accessToken !== 'string' || !accessToken) {
      return NextResponse.json(
        { message: 'Resposta inválida da API ao registrar.' },
        { status: 502 },
      );
    }

    const response = NextResponse.json({
      user: data.user,
      tenant: data.tenant,
    });

    applyAccessTokenCookie(response, accessToken);

    if (typeof data.refreshToken === 'string' && data.refreshToken) {
      applyRefreshTokenCookie(response, data.refreshToken);
    }

    return response;
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Erro ao registrar';
    const status = message.includes('API_URL') ? 503 : 502;
    return NextResponse.json({ message }, { status });
  }
}
