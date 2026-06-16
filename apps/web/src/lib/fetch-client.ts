import { fetchJson, FetchJsonError } from '@/lib/query/fetch-json';
import type { Client } from '@/types/client';

export async function fetchClientById(id: string): Promise<Client | null> {
  try {
    return await fetchJson<Client>(`/api/clients/${id}`);
  } catch (e) {
    if (e instanceof FetchJsonError) return null;
    throw e;
  }
}
