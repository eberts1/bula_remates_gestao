import { NextRequest, NextResponse } from 'next/server';
import { backendErrorMessage, fetchBackend } from '@/lib/api';
import { setAccessToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { res, data } = await fetchBackend('/auth/login', {
      method: 'POST',
      body: JSON.stringify(body),
      credentials: 'include',
    });

    if (!res.ok) {
      return NextResponse.json(
        { message: backendErrorMessage(data, res, 'Erro ao entrar') },
        { status: res.status },
      );
    }

    const accessToken = data.accessToken;
    if (typeof accessToken !== 'string' || !accessToken) {
      return NextResponse.json(
        { message: 'Resposta inválida da API ao entrar.' },
        { status: 502 },
      );
    }

    await setAccessToken(accessToken);

    const response = NextResponse.json({
      user: data.user,
      tenant: data.tenant,
    });

    if (typeof data.refreshToken === 'string' && data.refreshToken) {
      response.cookies.set('refresh_token', data.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 7 * 24 * 60 * 60,
      });
    }

    return response;
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Erro ao entrar';
    const status = message.includes('API_URL') ? 503 : 502;
    return NextResponse.json({ message }, { status });
  }
}
