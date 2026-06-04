export const ANIMAL_TYPES = ['corte', 'elite'] as const;
export const ANIMAL_SEXES = ['macho', 'femea'] as const;
export const LIVESTOCK_CATEGORIES = [
  'bezerra',
  'bezerro',
  'garrote',
  'novilha',
  'vaca',
  'touro',
] as const;

export type AnimalType = (typeof ANIMAL_TYPES)[number];
export type AnimalSex = (typeof ANIMAL_SEXES)[number];
export type LivestockCategory = (typeof LIVESTOCK_CATEGORIES)[number];

export const IMPORT_RESOLUTIONS = ['create', 'skip', 'update'] as const;
export type ImportResolution = (typeof IMPORT_RESOLUTIONS)[number];

export const DEFAULT_TENANT_INTENTIONS = [
  { code: 'comprador', label: 'Comprador', sortOrder: 0 },
  { code: 'vendedor', label: 'Vendedor', sortOrder: 1 },
  { code: 'prospect', label: 'Prospect', sortOrder: 2 },
  { code: 'inativo', label: 'Inativo', sortOrder: 3 },
] as const;
