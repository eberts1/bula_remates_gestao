import type { ClientExportRequest } from '@/types/client-export';

function triggerBlobDownload(blob: Blob, disposition: string) {
  const match = disposition.match(/filename="?([^"]+)"?/i);
  const filename = match?.[1] ?? 'contatos.xlsx';
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function exportClientsWithPurpose(
  payload: ClientExportRequest,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const res = await fetch('/api/clients/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return {
        ok: false,
        error:
          (data as { message?: string }).message ?? 'Erro ao exportar arquivo',
      };
    }

    const blob = await res.blob();
    triggerBlobDownload(
      blob,
      res.headers.get('content-disposition') ?? 'attachment; filename="contatos.xlsx"',
    );
    return { ok: true };
  } catch {
    return { ok: false, error: 'Erro ao exportar arquivo' };
  }
}

export function filtersFromSearchParams(
  params: URLSearchParams,
): ClientExportRequest['filters'] {
  const filters: NonNullable<ClientExportRequest['filters']> = {};
  const q = params.get('q');
  if (q) filters.q = q;

  for (const key of [
    'animalType',
    'animalSex',
    'livestockCategory',
    'intentionId',
    'state',
    'ddd',
    'nearCity',
    'nearState',
  ] as const) {
    const value = params.get(key);
    if (value) filters[key] = value;
  }

  for (const key of [
    'radiusKm',
    'boundsSouth',
    'boundsNorth',
    'boundsWest',
    'boundsEast',
    'areaCenterLat',
    'areaCenterLng',
    'areaRadiusKm',
  ] as const) {
    const value = params.get(key);
    if (value) filters[key] = Number(value);
  }

  return Object.keys(filters).length > 0 ? filters : undefined;
}
