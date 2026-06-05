import { NextRequest, NextResponse } from 'next/server';

import { getApiUrl } from '@/lib/api';
import { getAccessToken } from '@/lib/auth';

const FILTER_KEYS = [
  'q',
  'animalType',
  'animalSex',
  'livestockCategory',
  'intentionId',
  'state',
  'ddd',
  'nearCity',
  'nearState',
  'radiusKm',
  'boundsSouth',
  'boundsNorth',
  'boundsWest',
  'boundsEast',
  'areaCenterLat',
  'areaCenterLng',
  'areaRadiusKm',
] as const;

function buildForwardQuery(searchParams: URLSearchParams) {
  const forward = new URLSearchParams();
  for (const key of FILTER_KEYS) {
    const value = searchParams.get(key);
    if (value) forward.set(key, value);
  }
  return forward;
}

async function proxyExportResponse(res: Response) {
  if (!res.ok) {
    const text = await res.text();
    let message = 'Erro ao exportar';
    try {
      const parsed = JSON.parse(text) as { message?: string };
      if (parsed.message) message = parsed.message;
    } catch {
      if (text.trim()) message = text;
    }
    return NextResponse.json({ message }, { status: res.status });
  }

  const buffer = await res.arrayBuffer();
  const contentType =
    res.headers.get('content-type') ??
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  const disposition =
    res.headers.get('content-disposition') ??
    'attachment; filename="contatos.xlsx"';

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': disposition,
    },
  });
}

export async function GET(req: NextRequest) {
  const token = await getAccessToken();

  if (!token) {
    return NextResponse.json({ message: 'Não autenticado' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const query = buildForwardQuery(searchParams).toString();
  const url = `${getApiUrl()}/clients/export${query ? `?${query}` : ''}`;

  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      credentials: 'include',
    });
    return proxyExportResponse(res);
  } catch (e) {
    return NextResponse.json(
      { message: e instanceof Error ? e.message : 'Erro' },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  const token = await getAccessToken();

  if (!token) {
    return NextResponse.json({ message: 'Não autenticado' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const res = await fetch(`${getApiUrl()}/clients/export`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      credentials: 'include',
    });
    return proxyExportResponse(res);
  } catch (e) {
    return NextResponse.json(
      { message: e instanceof Error ? e.message : 'Erro' },
      { status: 500 },
    );
  }
}
