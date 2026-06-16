export interface ClientsListFilters {
  page: number;
  limit: number;
  q?: string;
  animalType?: string;
  animalSex?: string;
  livestockCategory?: string;
  intentionId?: string;
  nearCity?: string;
  nearState?: string;
  radiusKm?: string;
  state?: string;
  ddd?: string;
  boundsSouth?: string;
  boundsNorth?: string;
  boundsWest?: string;
  boundsEast?: string;
  areaCenterLat?: string;
  areaCenterLng?: string;
  areaRadiusKm?: string;
  view?: string;
}

const OPTIONAL_FILTER_KEYS = [
  'q',
  'animalType',
  'animalSex',
  'livestockCategory',
  'intentionId',
  'nearCity',
  'nearState',
  'radiusKm',
  'state',
  'ddd',
  'boundsSouth',
  'boundsNorth',
  'boundsWest',
  'boundsEast',
  'areaCenterLat',
  'areaCenterLng',
  'areaRadiusKm',
  'view',
] as const satisfies ReadonlyArray<keyof ClientsListFilters>;

export function buildClientsListQueryParams(
  filters: ClientsListFilters,
): Record<string, string> {
  const params: Record<string, string> = {
    page: String(filters.page),
    limit: String(filters.limit),
  };

  if (filters.q) params.q = filters.q;
  if (filters.animalType) params.animalType = filters.animalType;
  if (filters.animalSex) params.animalSex = filters.animalSex;
  if (filters.livestockCategory) {
    params.livestockCategory = filters.livestockCategory;
  }
  if (filters.intentionId) params.intentionId = filters.intentionId;
  if (filters.nearCity) params.nearCity = filters.nearCity;
  if (filters.nearState) params.nearState = filters.nearState;
  if (filters.radiusKm) params.radiusKm = filters.radiusKm;
  if (filters.state) params.state = filters.state;
  if (filters.ddd) params.ddd = filters.ddd;
  if (filters.boundsSouth) params.boundsSouth = filters.boundsSouth;
  if (filters.boundsNorth) params.boundsNorth = filters.boundsNorth;
  if (filters.boundsWest) params.boundsWest = filters.boundsWest;
  if (filters.boundsEast) params.boundsEast = filters.boundsEast;
  if (filters.areaCenterLat) params.areaCenterLat = filters.areaCenterLat;
  if (filters.areaCenterLng) params.areaCenterLng = filters.areaCenterLng;
  if (filters.areaRadiusKm) params.areaRadiusKm = filters.areaRadiusKm;
  if (filters.view) params.view = filters.view;

  return params;
}

export function clientsListFiltersFromSearchParams(
  params: URLSearchParams,
  overrides?: Partial<ClientsListFilters>,
): ClientsListFilters {
  const filters: ClientsListFilters = {
    page: overrides?.page ?? Number(params.get('page') ?? 1),
    limit: overrides?.limit ?? Number(params.get('limit') ?? 20),
  };

  for (const key of OPTIONAL_FILTER_KEYS) {
    const value = params.get(key);
    if (value) filters[key] = value;
  }

  return { ...filters, ...overrides };
}

export function buildClientsListSearchString(
  filters: ClientsListFilters,
): string {
  return new URLSearchParams(buildClientsListQueryParams(filters)).toString();
}
