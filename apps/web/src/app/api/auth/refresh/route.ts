import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { backendErrorMessage, fetchBackend } from '@/lib/api';
import {
  applyAccessTokenCookie,
  applyRefreshTokenCookie,
  REFRESH_COOKIE,
} from '@/lib/auth';

export async function POST() {
  const store = await cookies();
  const refreshToken = store.get(REFRESH_COOKIE)?.value;
  if (!refreshToken) {
    return NextResponse.json({ message: 'Sem sessão ativa' }, { status: 401 });
  }

  try {
    const { res, data } = await fetchBackend('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });

    if (!res.ok) {
      return NextResponse.json(
        { message: backendErrorMessage(data, res, 'Sessão expirada') },
        { status: res.status },
      );
    }

    const accessToken = data.accessToken;
    if (typeof accessToken !== 'string' || !accessToken) {
      return NextResponse.json(
        { message: 'Resposta inválida ao renovar sessão' },
        { status: 502 },
      );
    }

    const response = NextResponse.json({ ok: true });
    applyAccessTokenCookie(response, accessToken);

    const newRefresh = data.refreshToken;
    if (typeof newRefresh === 'string' && newRefresh) {
      applyRefreshTokenCookie(response, newRefresh);
    }
    return response;
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Erro ao renovar sessão';
    return NextResponse.json({ message }, { status: 502 });
  }
}
