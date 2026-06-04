import type { ClientProperty } from '@/types/client';
import { emptyProperty } from '@/types/client';
import type { HygieneClient } from '@/types/client-hygiene';

export interface HygieneEditState {
  name: string;
  document: string;
  email: string;
  phone: string;
  addressFull: string;
  properties: ClientProperty[];
  animalType: string;
  animalSex: string;
  livestockCategory: string;
  intentionIds: string[];
}

export function toHygieneEditState(client: HygieneClient): HygieneEditState {
  return {
    name: client.name,
    document: client.document ?? '',
    email: client.email ?? '',
    phone: client.phone ?? '',
    addressFull: client.addressFull ?? '',
    properties:
      client.properties.length > 0
        ? client.properties.map((p) => ({ ...p }))
        : [emptyProperty()],
    animalType: client.animalType ?? '',
    animalSex: client.animalSex ?? '',
    livestockCategory: client.livestockCategory ?? '',
    intentionIds: client.intentions.map((i) => i.id),
  };
}

function serializeHygieneEditState(state: HygieneEditState): string {
  return JSON.stringify({
    name: state.name.trim(),
    document: state.document.trim(),
    email: state.email.trim(),
    phone: state.phone.trim(),
    addressFull: state.addressFull.trim(),
    animalType: state.animalType,
    animalSex: state.animalSex,
    livestockCategory: state.livestockCategory,
    intentionIds: [...state.intentionIds].sort(),
    properties: state.properties.map((p) => ({
      id: p.id,
      farmName: p.farmName.trim(),
      city: p.city.trim(),
      state: p.state.trim().toUpperCase(),
      routeNotes: (p.routeNotes ?? '').trim(),
      phone: (p.phone ?? '').trim(),
      ie: (p.ie ?? '').trim(),
      nirf: (p.nirf ?? '').trim(),
    })),
  });
}

export function isHygieneEditDirty(
  initial: HygieneEditState,
  current: HygieneEditState,
): boolean {
  return (
    serializeHygieneEditState(initial) !== serializeHygieneEditState(current)
  );
}
