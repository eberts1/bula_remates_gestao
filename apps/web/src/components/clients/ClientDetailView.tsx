'use client';

import type { Client } from '@/types/client';
import { collectClientPhones } from '@/lib/client-phones';

interface Props {
  client: Client;
  onEdit: () => void;
}

function DetailField({
  label,
  value,
  fullWidth = false,
}: {
  label: string;
  value: string | null | undefined;
  fullWidth?: boolean;
}) {
  return (
    <div className={`detail-field${fullWidth ? ' detail-field-full' : ''}`}>
      <dt>{label}</dt>
      <dd>{value?.trim() ? value : '—'}</dd>
    </div>
  );
}

function formatAllPhones(client: Client): string | null {
  const { phone, phone2, extraPhones } = collectClientPhones({
    phone: client.phone,
    properties: client.properties,
    notes: client.notes,
  });
  const parts = [phone, phone2, ...extraPhones.split('\n').filter(Boolean)].filter(
    Boolean,
  );
  return parts.length > 0 ? parts.join(' · ') : null;
}

export function ClientDetailView({ client, onEdit }: Props) {
  const allPhones = formatAllPhones(client);

  return (
    <div className="card">
      <div className="detail-header">
        <div>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>{client.name}</h2>
          <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
            {!client.isComplete && (
              <span className="badge badge-incomplete">Cadastro incompleto</span>
            )}
            <span className={`badge ${client.active ? 'badge-active' : 'badge-inactive'}`}>
              {client.active ? 'Ativo' : 'Inativo'}
            </span>
            {client.isDefault && <span className="badge">Padrão</span>}
          </div>
        </div>
        <button type="button" className="primary" onClick={onEdit}>
          Editar
        </button>
      </div>

      <section className="form-section">
        <h3 className="form-section-title">Dados do cliente</h3>
        <dl className="detail-grid">
          <DetailField label="Nome" value={client.name} />
          <DetailField label="CPF/CNPJ" value={client.document} />
          <DetailField label="E-mail" value={client.email} />
          <DetailField label="Telefones" value={allPhones} />
          <DetailField label="Endereço completo" value={client.addressFull} fullWidth />
        </dl>
      </section>

      <section className="form-section">
        <h3 className="form-section-title">Propriedades</h3>
        {client.properties.length === 0 ? (
          <p style={{ fontSize: '0.875rem', color: 'var(--muted)' }}>
            Nenhuma propriedade cadastrada.
          </p>
        ) : (
          client.properties.map((property, index) => (
            <div key={property.id ?? index} className="property-card">
              <strong style={{ display: 'block', marginBottom: '0.75rem' }}>
                Propriedade {index + 1}
              </strong>
              <dl className="detail-grid">
                <DetailField label="Nome da fazenda" value={property.farmName} />
                <DetailField label="Cidade" value={property.city} />
                <DetailField label="Estado" value={property.state} />
                <DetailField label="Telefone da propriedade" value={property.phone} />
                <DetailField label="Inscrição Estadual (IE)" value={property.ie} />
                <DetailField label="NIRF" value={property.nirf} />
                <DetailField
                  label="Roteiro / como chegar"
                  value={property.routeNotes}
                  fullWidth
                />
              </dl>
            </div>
          ))
        )}
      </section>

      <section className="form-section">
        <h3 className="form-section-title">Administração</h3>
        <dl className="detail-grid">
          <DetailField label="Responsável" value={client.responsible?.name} />
          <DetailField label="Observações" value={client.notes} fullWidth />
        </dl>
      </section>
    </div>
  );
}
