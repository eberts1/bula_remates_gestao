'use client';

import { useCallback, useState } from 'react';

import { AppShell } from '@/components/AppShell';
import { ClientExportDialog } from '@/components/clients/ClientExportDialog';
import {
  ClientsMapPanel,
  exportClientsByArea,
} from '@/components/clients/ClientsMapPanel';
import type { ClientExportRequest } from '@/types/client-export';
import type { MapAreaSelection } from '@/types/map-area';

export default function ClientsMapPage() {
  const [selectedArea, setSelectedArea] = useState<MapAreaSelection | null>(
    null,
  );
  const [selectedCount, setSelectedCount] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSelectedCountChange = useCallback((count: number) => {
    setSelectedCount(count);
  }, []);

  async function handleExportConfirm(purposePayload: ClientExportRequest) {
    if (!selectedArea) return;

    setError(null);
    const result = await exportClientsByArea(
      new URLSearchParams(),
      selectedArea,
      purposePayload,
    );

    if (!result.ok) {
      setError(result.error ?? 'Erro ao exportar');
      throw new Error(result.error ?? 'Erro ao exportar');
    }
  }

  return (
    <AppShell title="Mapa de clientes">
      <div className="clients-map-page-actions">
        {selectedArea ? (
          <>
            <p className="clients-map-selection-info">
              Região selecionada com <strong>{selectedCount}</strong> cliente
              {selectedCount !== 1 ? 's' : ''}.
            </p>
            <div className="clients-map-page-buttons">
              <button
                type="button"
                className="primary"
                onClick={() => setExportDialogOpen(true)}
                disabled={exporting || selectedCount === 0}
              >
                {exporting ? 'Exportando…' : 'Exportar região selecionada'}
              </button>
              <button
                type="button"
                className="ghost"
                onClick={() => setSelectedArea(null)}
              >
                Limpar seleção
              </button>
            </div>
          </>
        ) : (
          <p className="clients-map-selection-hint">
            Selecione uma área no mapa para exportar os clientes daquela região.
          </p>
        )}
      </div>

      {error && <p className="error">{error}</p>}

      <ClientsMapPanel
        selectedArea={selectedArea}
        onAreaChange={setSelectedArea}
        onSelectedCountChange={handleSelectedCountChange}
      />

      <ClientExportDialog
        open={exportDialogOpen}
        clientCount={selectedCount}
        onClose={() => {
          if (!exporting) setExportDialogOpen(false);
        }}
        onConfirm={async (payload) => {
          setExporting(true);
          try {
            await handleExportConfirm(payload);
          } finally {
            setExporting(false);
          }
        }}
      />
    </AppShell>
  );
}
