import type { Client, ClientProperty } from '@/types/client';
import type { DuplicateGroup, MergeResolution } from '@/types/client-hygiene';

export function normalizeName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export interface NameCluster {
  displayName: string;
  normalizedName: string;
  indices: number[];
  clientIds: string[];
}

export function clusterClientsByExactName(clients: Client[]): NameCluster[] {
  const byName = new Map<string, number[]>();

  clients.forEach((client, index) => {
    const key = normalizeName(client.name);
    if (key.length < 3) return;
    const list = byName.get(key) ?? [];
    list.push(index);
    byName.set(key, list);
  });

  return [...byName.entries()].map(([normalizedName, indices]) => ({
    normalizedName,
    displayName: clients[indices[0]].name,
    indices,
    clientIds: indices.map((i) => clients[i].id),
  }));
}

export function filterDuplicateGroup(
  group: DuplicateGroup,
  selectedIds: string[],
): DuplicateGroup {
  const idSet = new Set(selectedIds);
  return {
    ...group,
    clients: group.clients.filter((c) => idSet.has(c.id)),
  };
}

export function initialSelectedIdSet(
  group: DuplicateGroup,
  initialSelectedIds?: string[] | null,
): Set<string> {
  if (initialSelectedIds?.length) {
    const ids = initialSelectedIds.filter((id) =>
      group.clients.some((c) => c.id === id),
    );
    if (ids.length > 0) return new Set(ids);
  }
  return new Set(group.clients.map((c) => c.id));
}

function propertyKey(p: ClientProperty): string {
  return `${p.farmName.trim().toLowerCase()}|${p.city.trim().toLowerCase()}|${p.state.trim().toUpperCase()}`;
}

export interface ClientRichness {
  clientId: string;
  index: number;
  score: number;
  filledFields: number;
  totalFields: number;
  details: string[];
}

export interface FieldOption {
  value: string;
  clientId: string;
  clientIndex: number;
  clientLabel: string;
}

export interface MergeRecommendation {
  masterId: string;
  masterIndex: number;
  reason: string;
  richness: ClientRichness;
}

export function shortClientId(id: string): string {
  return id.slice(0, 8);
}

export function formatClientLabel(client: Client, index: number): string {
  const parts = [`Cadastro #${index + 1}`];
  if (client.document?.trim()) parts.push(client.document.trim());
  if (client.email?.trim()) parts.push(client.email.trim());
  if (client.phone?.trim()) parts.push(client.phone.trim());
  const farm = client.properties[0];
  if (farm?.farmName?.trim()) {
    const loc = [farm.city, farm.state].filter(Boolean).join('/');
    parts.push(loc ? `${farm.farmName} (${loc})` : farm.farmName);
  }
  return parts.join(' · ');
}

export function computeClientRichness(
  client: Client,
  index: number,
): ClientRichness {
  let score = 0;
  const details: string[] = [];

  const scalarFields = [
    ['document', client.document],
    ['e-mail', client.email],
    ['telefone', client.phone],
    ['endereço', client.addressFull],
  ] as const;

  let filled = 0;
  const total = scalarFields.length + 3;

  for (const [label, value] of scalarFields) {
    if (value?.trim()) {
      score += 2;
      filled += 1;
      details.push(label);
    }
  }

  if (client.properties.length > 0) {
    score += client.properties.length * 3;
    filled += 1;
    details.push(
      `${client.properties.length} fazenda${client.properties.length > 1 ? 's' : ''}`,
    );
  }

  if (client.intentions.length > 0) {
    score += client.intentions.length;
    filled += 1;
    details.push(`${client.intentions.length} intenção(ões)`);
  }

  if (client.animalType || client.livestockCategory) {
    score += 1;
    filled += 1;
    details.push('etiquetas');
  }

  if (client.documentCount > 0) {
    score += client.documentCount * 2;
    details.push(`${client.documentCount} documento(s)`);
  }

  if (client.isComplete) score += 5;

  return {
    clientId: client.id,
    index,
    score,
    filledFields: filled,
    totalFields: total,
    details,
  };
}

export function recommendMaster(
  group: DuplicateGroup | { clients: Client[] },
  /** Lista completa do drawer para exibir Cadastro #N correto */
  indexContext?: Client[],
): MergeRecommendation | null {
  const clients = group.clients;
  if (clients.length === 0) return null;

  const ranked = clients
    .map((c, i) => computeClientRichness(c, i))
    .sort((a, b) => b.score - a.score);

  const best = ranked[0];
  if (!best) return null;

  const client =
    clients.find((c) => c.id === best.clientId) ?? clients[best.index];
  if (!client) return null;

  const context = indexContext ?? clients;
  const masterIndex = context.findIndex((c) => c.id === best.clientId);

  let reason = `Mais completo (${best.score} pts)`;
  if (client.isComplete) {
    reason = 'Perfil marcado como completo';
  } else if (best.details.length > 0) {
    reason = `Tem: ${best.details.slice(0, 4).join(', ')}`;
  }

  return {
    masterId: best.clientId,
    masterIndex: masterIndex >= 0 ? masterIndex : best.index,
    reason,
    richness: best,
  };
}

export function mergeAllProperties(
  clients: Client[],
): (ClientProperty & { sourceIndex: number })[] {
  const seen = new Set<string>();
  const result: (ClientProperty & { sourceIndex: number })[] = [];

  clients.forEach((client, clientIndex) => {
    for (const p of client.properties) {
      const key = propertyKey(p);
      if (seen.has(key)) continue;
      seen.add(key);
      result.push({ ...p, sourceIndex: clientIndex });
    }
  });
  return result;
}

export function mergeAllIntentionIds(clients: Client[]): string[] {
  const ids = new Set<string>();
  for (const client of clients) {
    for (const i of client.intentions) ids.add(i.id);
  }
  return [...ids];
}

function pickBestScalar(
  clients: Client[],
  field: 'name' | 'document' | 'email' | 'phone' | 'addressFull',
): string | null {
  const values = clients
    .map((c) => {
      const v = c[field];
      return typeof v === 'string' ? v.trim() : '';
    })
    .filter(Boolean);

  if (values.length === 0) return null;
  if (field === 'name') {
    return values.sort((a, b) => b.length - a.length)[0];
  }
  return values[0];
}

function pickBestTags(clients: Client[]): {
  animalType: string | null;
  animalSex: string | null;
  livestockCategory: string | null;
} {
  for (const c of clients) {
    if (c.animalType || c.livestockCategory || c.animalSex) {
      return {
        animalType: c.animalType,
        animalSex: c.animalSex,
        livestockCategory: c.livestockCategory,
      };
    }
  }
  return { animalType: null, animalSex: null, livestockCategory: null };
}

/** Combina o melhor de cada cadastro (não descarta fazendas nem intenções). */
export function buildCombinedMergeState(group: DuplicateGroup): MergeResolution {
  const { clients } = group;
  const tags = pickBestTags(clients);

  return {
    name: pickBestScalar(clients, 'name') ?? clients[0].name,
    document: pickBestScalar(clients, 'document'),
    email: pickBestScalar(clients, 'email'),
    phone: pickBestScalar(clients, 'phone'),
    addressFull: pickBestScalar(clients, 'addressFull'),
    animalType: tags.animalType,
    animalSex: tags.animalSex,
    livestockCategory: tags.livestockCategory,
    intentionIds: mergeAllIntentionIds(clients),
    properties: mergeAllProperties(clients),
  };
}

export function buildInitialMergeState(
  group: DuplicateGroup,
  masterId: string,
): MergeResolution {
  const combined = buildCombinedMergeState(group);
  const master = group.clients.find((c) => c.id === masterId) ?? group.clients[0];

  return {
    ...combined,
    name: master.name || combined.name,
    properties: mergeAllProperties(group.clients),
  };
}

export function collectFieldOptions(
  clients: Client[],
  field: keyof Pick<
    Client,
    | 'name'
    | 'document'
    | 'email'
    | 'phone'
    | 'addressFull'
    | 'animalType'
    | 'animalSex'
    | 'livestockCategory'
  >,
): FieldOption[] {
  const options: FieldOption[] = [];

  clients.forEach((client, clientIndex) => {
    const raw = client[field];
    const value = typeof raw === 'string' ? raw.trim() : '';
    if (!value) return;
    if (options.some((o) => o.value === value && o.clientId === client.id)) {
      return;
    }
    options.push({
      value,
      clientId: client.id,
      clientIndex,
      clientLabel: formatClientLabel(client, clientIndex),
    });
  });
  return options;
}

export function previewAlternateContacts(
  clients: Client[],
  chosenEmail: string | null,
  chosenPhone: string | null,
): string[] {
  const alts: string[] = [];
  const emailNorm = chosenEmail?.trim().toLowerCase() ?? '';
  const phoneNorm = chosenPhone?.replace(/\D/g, '') ?? '';

  for (const c of clients) {
    const email = c.email?.trim();
    if (email && email.toLowerCase() !== emailNorm && !alts.includes(email)) {
      alts.push(email);
    }
    const phone = c.phone?.trim();
    if (phone) {
      const digits = phone.replace(/\D/g, '');
      if (digits && digits !== phoneNorm && !alts.includes(phone)) {
        alts.push(phone);
      }
    }
  }
  return alts;
}
