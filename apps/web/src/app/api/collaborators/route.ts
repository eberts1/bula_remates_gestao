import { NextRequest, NextResponse } from 'next/server';

import { apiFetch } from '@/lib/api';

import { getAccessToken } from '@/lib/auth';



export async function GET(req: NextRequest) {

  const token = await getAccessToken();

  if (!token) {

    return NextResponse.json({ message: 'Não autenticado' }, { status: 401 });

  }



  const { searchParams } = new URL(req.url);

  const query = new URLSearchParams();

  const q = searchParams.get('q');

  const teamId = searchParams.get('teamId');

  const active = searchParams.get('active');

  const page = searchParams.get('page') ?? '1';

  const limit = searchParams.get('limit') ?? '20';

  query.set('page', page);

  query.set('limit', limit);

  if (q) query.set('q', q);

  if (teamId) query.set('teamId', teamId);

  if (active) query.set('active', active);



  try {

    const data = await apiFetch(`/collaborators?${query}`, { accessToken: token });

    return NextResponse.json(data);

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

    const data = await apiFetch('/collaborators', {

      method: 'POST',

      accessToken: token,

      body: JSON.stringify(body),

    });

    return NextResponse.json(data, { status: 201 });

  } catch (e) {

    return NextResponse.json(

      { message: e instanceof Error ? e.message : 'Erro' },

      { status: 500 },

    );

  }

}


