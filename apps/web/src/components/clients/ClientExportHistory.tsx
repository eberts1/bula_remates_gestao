'use client';

import {
  CLIENT_EXPORT_PURPOSE_LABELS,
  type ClientExportPurpose,
} from '@docs/shared';
import { useCallback, useEffect, useState } from 'react';

import type {
  ClientExportBatchItem,
  ClientExportSummary,
} from '@/types/client-export';

function formatDate(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
}

function summarizeFilters(
  filters: Record<string, string | number> | null | undefined,
) {
  if (!filters || Object.keys(filters).length === 0) {
    return 'Todos os clientes';
  }

  const parts: string[] = [];
  if (filters.q) parts.push(`busca: ${filters.q}`);
  if (filters.animalType) parts.push(`tipo: ${filters.animalType}`);
  if (filters.animalSex) parts.push(`sexo: ${filters.animalSex}`);
  if (filters.livestockCategory) {
    parts.push(`categoria: ${filters.livestockCategory}`);
  }
  if (filters.state) parts.push(`UF: ${filters.state}`);
  if (filters.ddd) parts.push(`DDD: ${filters.ddd}`);
  if (filters.intentionId) parts.push('intenção filtrada');
  if (filters.nearCity) {
    parts.push(`proximidade: ${filters.nearCity}/${filters.nearState ?? ''}`);
  }
  if (filters.areaCenterLat != null) parts.push('área no mapa');
  if (filters.boundsSouth != null) parts.push('retângulo no mapa');

  return parts.join(' · ') || 'Filtros personalizados';
}

function describeBatch(item: ClientExportBatchItem) {
  const parts: string[] = [CLIENT_EXPORT_PURPOSE_LABELS[item.purpose]];
  if (item.destination) parts.push(item.destination);
  if (item.recipientName) parts.push(`para ${item.recipientName}`);
  return parts.join(' · ');
}

interface Props {
  refreshKey?: number;
}

export function ClientExportHistory({ refreshKey = 0 }: Props) {
  const [summary, setSummary] = useState<ClientExportSummary | null>(null);
  const [items, setItems] = useState<ClientExportBatchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const [summaryRes, historyRes] = await Promise.all([
        fetch('/api/clients/exports/summary'),
        fetch('/api/clients/exports/history?limit=10'),
      ]);

      const summaryData = await summaryRes.json();
      const historyData = await historyRes.json();

      if (!summaryRes.ok || !historyRes.ok) {
        setError(
          summaryData.message ??
            historyData.message ??
            'Erro ao carregar histórico',
        );
        return;
      }

      setSummary(summaryData as ClientExportSummary);
      setItems((historyData as { items?: ClientExportBatchItem[] }).items ?? []);
    } catch {
      setError('Erro ao carregar histórico');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  if (loading) {
    return (
      <div className="card export-history-card">
        <p className="export-preview-empty">Carregando histórico…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card export-history-card">
        <p className="export-error">{error}</p>
      </div>
    );
  }

  return (
    <div className="export-history-section">
      {summary && (
        <div className="export-history-stats">
          <div className="export-stat-card card">
            <span className="export-stat-label">Exportações</span>
            <strong>{summary.totalExports}</strong>
          </div>
          <div className="export-stat-card card">
            <span className="export-stat-label">Contatos exportados</span>
            <strong>{summary.totalClientsExported}</strong>
          </div>
          <div className="export-stat-card card">
            <span className="export-stat-label">Últimos 30 dias</span>
            <strong>{summary.exportsLast30Days}</strong>
          </div>
          {summary.byPurpose.map((row) => (
            <div key={row.purpose} className="export-stat-card card">
              <span className="export-stat-label">
                {CLIENT_EXPORT_PURPOSE_LABELS[row.purpose as ClientExportPurpose]}
              </span>
              <strong>
                {row.exportCount} exp · {row.clientCount} contatos
              </strong>
            </div>
          ))}
        </div>
      )}

      <div className="card export-history-card">
        <div className="export-history-header">
          <div>
            <h2 className="export-map-title">Histórico recente</h2>
            <p className="export-map-subtitle">
              Rastreie para onde foram os dados exportados e quantos cadastros
              saíram em cada ação.
            </p>
          </div>
        </div>

        {items.length === 0 ? (
          <p className="export-preview-empty">
            Nenhuma exportação registrada ainda.
          </p>
        ) : (
          <div className="export-table-wrap">
            <table className="export-table export-history-table">
              <thead>
                <tr>
                  <th>Quando</th>
                  <th>Quem</th>
                  <th>Ação</th>
                  <th>Contatos</th>
                  <th>Filtros</th>
                  <th>Observações</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>{formatDate(item.createdAt)}</td>
                    <td>{item.createdBy.name}</td>
                    <td>{describeBatch(item)}</td>
                    <td>{item.clientCount}</td>
                    <td className="export-cell-notes">
                      {summarizeFilters(item.filters)}
                    </td>
                    <td className="export-cell-notes">{item.notes ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
