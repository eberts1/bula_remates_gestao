import { NextRequest, NextResponse } from 'next/server';
import { getApiUrl } from '@/lib/api';
import { clearAccessToken, getAccessToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const token = await getAccessToken();
  const cookieHeader = req.headers.get('cookie') ?? '';

  if (token) {
    await fetch(`${getApiUrl()}/auth/logout`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Cookie: cookieHeader,
      },
      credentials: 'include',
    }).catch(() => undefined);
  }

  await clearAccessToken();
  const response = NextResponse.json({ ok: true });
  response.cookies.delete('refresh_token');
  return response;
}
