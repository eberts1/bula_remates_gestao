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

  const state = searchParams.get('state');

  const ddd = searchParams.get('ddd');

  const nearCity = searchParams.get('nearCity');

  const nearState = searchParams.get('nearState');

  const radiusKm = searchParams.get('radiusKm');

  const boundsSouth = searchParams.get('boundsSouth');

  const boundsNorth = searchParams.get('boundsNorth');

  const boundsWest = searchParams.get('boundsWest');

  const boundsEast = searchParams.get('boundsEast');

  const areaCenterLat = searchParams.get('areaCenterLat');

  const areaCenterLng = searchParams.get('areaCenterLng');

  const areaRadiusKm = searchParams.get('areaRadiusKm');

  const view = searchParams.get('view');

  const query = new URLSearchParams({ page, limit });

  if (q) query.set('q', q);

  if (animalType) query.set('animalType', animalType);

  if (animalSex) query.set('animalSex', animalSex);

  if (livestockCategory) query.set('livestockCategory', livestockCategory);

  if (intentionId) query.set('intentionId', intentionId);

  if (state) query.set('state', state);

  if (ddd) query.set('ddd', ddd);

  if (nearCity) query.set('nearCity', nearCity);

  if (nearState) query.set('nearState', nearState);

  if (radiusKm) query.set('radiusKm', radiusKm);

  if (boundsSouth) query.set('boundsSouth', boundsSouth);

  if (boundsNorth) query.set('boundsNorth', boundsNorth);

  if (boundsWest) query.set('boundsWest', boundsWest);

  if (boundsEast) query.set('boundsEast', boundsEast);

  if (areaCenterLat) query.set('areaCenterLat', areaCenterLat);

  if (areaCenterLng) query.set('areaCenterLng', areaCenterLng);

  if (areaRadiusKm) query.set('areaRadiusKm', areaRadiusKm);

  if (view) query.set('view', view);



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


