import { NextRequest, NextResponse } from 'next/server';

import { apiFetch } from '@/lib/api';

import { getAccessToken } from '@/lib/auth';



export async function GET(req: NextRequest) {

  const token = await getAccessToken();

  if (!token) {

    return NextResponse.json({ message: 'Não autenticado' }, { status: 401 });

  }



  const { searchParams } = new URL(req.url);

  const q = searchParams.get('q');

  const page = searchParams.get('page') ?? '1';

  const limit = searchParams.get('limit') ?? '20';

  const animalType = searchParams.get('animalType');

  const animalSex = searchParams.get('animalSex');

  const livestockCategory = searchParams.get('livestockCategory');

  const intentionId = searchParams.get('intentionId');

  const query = new URLSearchParams({ page, limit });

  if (q) query.set('q', q);

  if (animalType) query.set('animalType', animalType);

  if (animalSex) query.set('animalSex', animalSex);

  if (livestockCategory) query.set('livestockCategory', livestockCategory);

  if (intentionId) query.set('intentionId', intentionId);



  try {

    const data = await apiFetch(`/clients?${query}`, { accessToken: token });

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

    const data = await apiFetch('/clients', {

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


