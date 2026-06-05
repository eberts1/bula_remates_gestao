'use client';

import dynamic from 'next/dynamic';
import { useEffect, useMemo, useState } from 'react';

import type { ClientMapPoint } from '@/types/client-map';
import type { ClientExportRequest } from '@/types/client-export';
import {
  exportClientsWithPurpose,
  filtersFromSearchParams,
} from '@/lib/client-export';
import {
  appendMapAreaToParams,
  isPointInMapArea,
  type MapAreaSelection,
} from '@/types/map-area';

const ClientsMap = dynamic(
  () => import('@/components/clients/ClientsMap').then((m) => m.ClientsMap),
  { ssr: false, loading: () => <div className="clients-map-skeleton" /> },
);

interface Props {
  selectedArea: MapAreaSelection | null;
  onAreaChange: (area: MapAreaSelection | null) => void;
  onSelectedCountChange?: (count: number) => void;
  showLegend?: boolean;
}

export function ClientsMapPanel({
  selectedArea,
  onAreaChange,
  onSelectedCountChange,
  showLegend = true,
}: Props) {
  const [points, setPoints] = useState<ClientMapPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/clients/map')
      .then((r) => {
        if (!r.ok) throw new Error('Falha ao carregar mapa');
        return r.json();
      })
      .then((data: { items?: ClientMapPoint[] }) => {
        setPoints(data.items ?? []);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Erro'))
      .finally(() => setLoading(false));
  }, []);

  const exactCount = points.filter((p) => !p.approx).length;
  const approxCount = points.filter((p) => p.approx).length;

  const selectedCount = useMemo(() => {
    if (!selectedArea) return points.length;
    return points.filter((p) =>
      isPointInMapArea(p.lat, p.lng, selectedArea),
    ).length;
  }, [points, selectedArea]);

  useEffect(() => {
    onSelectedCountChange?.(selectedCount);
  }, [selectedCount, onSelectedCountChange]);

  return (
    <div className="clients-map-panel">
      <p className="clients-map-desc">
        Desenhe um retângulo ou círculo no mapa para selecionar a região.
        Use os controles no canto superior direito do mapa.
      </p>

      {showLegend && (
        <div className="clients-map-legend">
          <span className="clients-map-legend-item">
            <i className="client-map-marker client-map-marker--exact" />
            Cidade cadastrada ({exactCount})
          </span>
          <span className="clients-map-legend-item">
            <i className="client-map-marker client-map-marker--approx" />
            Aproximado por DDD ({approxCount})
          </span>
          {selectedArea && (
            <span className="clients-map-legend-item clients-map-legend-selected">
              Selecionados: <strong>{selectedCount}</strong>
            </span>
          )}
        </div>
      )}

      {loading ? (
        <div className="clients-map-skeleton" />
      ) : error ? (
        <p className="error">{error}</p>
      ) : points.length === 0 ? (
        <p className="dashboard-empty">
          Nenhum cliente com localização disponível.
        </p>
      ) : (
        <ClientsMap
          points={points}
          enableAreaSelect
          selectedArea={selectedArea}
          onAreaChange={onAreaChange}
        />
      )}
    </div>
  );
}

export async function exportClientsByArea(
  baseParams: URLSearchParams,
  area: MapAreaSelection | null,
  purposePayload: Omit<ClientExportRequest, 'filters'>,
): Promise<{ ok: boolean; error?: string }> {
  const params = new URLSearchParams(baseParams);
  appendMapAreaToParams(params, area);

  return exportClientsWithPurpose({
    ...purposePayload,
    filters: filtersFromSearchParams(params),
  });
}
