'use client';

import { ensureBrazilMobileNinthDigit } from '@docs/shared';
import type { Client } from '@/types/client';

const ANIMAL_TYPE_LABELS: Record<string, string> = {
  corte: 'Corte',
  elite: 'Elite',
};

const ANIMAL_SEX_LABELS: Record<string, string> = {
  macho: 'Macho',
  femea: 'Fêmea',
};

const CATEGORY_LABELS: Record<string, string> = {
  bezerra: 'Bezerra',
  bezerro: 'Bezerro',
  garrote: 'Garrote',
  novilha: 'Novilha',
  vaca: 'Vaca',
  touro: 'Touro',
};

function extractDdd(phone: string | null | undefined): string {
  if (!phone?.trim()) return '';
  const digits = phone.replace(/\D/g, '');
  const local = digits.startsWith('55') ? digits.slice(2) : digits;
  return local.length >= 2 ? local.slice(0, 2) : '';
}

function primaryProperty(client: Client) {
  return client.properties[0] ?? null;
}

function clientDdd(client: Client): string {
  const fromClient = extractDdd(client.phone);
  if (fromClient) return fromClient;
  for (const property of client.properties) {
    const ddd = extractDdd(property.phone);
    if (ddd) return ddd;
  }
  return '';
}

interface Props {
  clients: Client[];
  loading: boolean;
}

export function ClientExportPreviewTable({ clients, loading }: Props) {
  if (loading) {
    return <p className="export-preview-empty">Carregando pré-visualização…</p>;
  }

  if (clients.length === 0) {
    return (
      <p className="export-preview-empty">
        Nenhum cliente encontrado com os filtros atuais.
      </p>
    );
  }

  return (
    <div className="export-table-wrap">
      <p className="export-preview-legend">
        Colunas com <span className="export-col-badge">export</span> entram no
        arquivo Excel. As demais são apenas para conferência na tela.
      </p>
      <table className="export-table">
        <thead>
          <tr>
            <th className="export-col-export">nome</th>
            <th className="export-col-export">telefone</th>
            <th className="export-col-export">email</th>
            <th className="export-col-export">documento</th>
            <th className="export-col-export">observacao</th>
            <th className="export-col-export">status</th>
            <th className="export-col-export">tipo_interesse</th>
            <th className="export-col-export">sexo_interesse</th>
            <th className="export-col-export">categoria_interesse</th>
            <th>fazenda</th>
            <th>cidade/UF</th>
            <th>DDD</th>
          </tr>
        </thead>
        <tbody>
          {clients.map((client) => {
            const property = primaryProperty(client);
            const cityUf = property
              ? `${property.city}/${property.state}`
              : '—';
            const farmName = property?.farmName ?? '—';

            return (
              <tr key={client.id}>
                <td>{client.name}</td>
                <td>
                  {client.phone
                    ? ensureBrazilMobileNinthDigit(client.phone)
                    : '—'}
                </td>
                <td>{client.email ?? '—'}</td>
                <td>{client.document ?? '—'}</td>
                <td className="export-cell-notes">{client.notes ?? '—'}</td>
                <td>{client.active ? 'ativo' : 'inativo'}</td>
                <td>
                  {client.animalType
                    ? (ANIMAL_TYPE_LABELS[client.animalType] ?? client.animalType)
                    : '—'}
                </td>
                <td>
                  {client.animalSex
                    ? (ANIMAL_SEX_LABELS[client.animalSex] ?? client.animalSex)
                    : '—'}
                </td>
                <td>
                  {client.livestockCategory
                    ? (CATEGORY_LABELS[client.livestockCategory] ??
                      client.livestockCategory)
                    : '—'}
                </td>
                <td>{farmName}</td>
                <td>{cityUf}</td>
                <td>{clientDdd(client) || '—'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
