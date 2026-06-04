import { NextRequest, NextResponse } from 'next/server';

import { apiFetch } from '@/lib/api';

import { getAccessToken } from '@/lib/auth';



export async function GET() {

  const token = await getAccessToken();

  if (!token) {

    return NextResponse.json({ message: 'Não autenticado' }, { status: 401 });

  }



  try {

    const data = await apiFetch('/teams', { accessToken: token });

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

    const data = await apiFetch('/teams', {

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


