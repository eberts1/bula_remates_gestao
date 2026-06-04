'use client';

import { useState } from 'react';
import { ClientDataSection, type ClientDataFields } from './ClientDataSection';
import { ClientPropertiesSection } from './ClientPropertiesSection';
import { PublicDocumentUpload } from './PublicDocumentUpload';
import type { ClientProperty } from '@/types/client';
import { emptyProperty } from '@/types/client';

export type RegistrationMode =
  | 'internal'
  | 'publicCreate'
  | 'publicEdit'
  | 'publicStaticCreate';

export interface InternalAdminFields {
  notes: string;
  active: boolean;
  responsibleId: string;
}

interface Props {
  mode: RegistrationMode;
  token?: string;
  tenantSlug?: string;
  initialData?: ClientDataFields;
  initialProperties?: ClientProperty[];
  initialAdmin?: InternalAdminFields;
  collaborators?: { id: string; name: string }[];
  onSubmitInternal?: (payload: {
    data: ClientDataFields;
    properties: ClientProperty[];
    admin: InternalAdminFields;
  }) => Promise<void>;
  onSubmitPublic?: (payload: {
    data: ClientDataFields;
    properties: ClientProperty[];
  }) => Promise<{ clientId: string }>;
  onFinalizePublic?: () => Promise<void>;
  submitLabel?: string;
}

const emptyData: ClientDataFields = {
  name: '',
  document: '',
  email: '',
  phone: '',
  phone2: '',
  extraPhones: '',
  addressFull: '',
};

const emptyAdmin: InternalAdminFields = {
  notes: '',
  active: true,
  responsibleId: '',
};

export function ClientRegistrationForm({
  mode,
  token,
  tenantSlug,
  initialData,
  initialProperties,
  initialAdmin,
  collaborators = [],
  onSubmitInternal,
  onSubmitPublic,
  onFinalizePublic,
  submitLabel,
}: Props) {
  const [data, setData] = useState<ClientDataFields>(initialData ?? emptyData);
  const [properties, setProperties] = useState<ClientProperty[]>(
    initialProperties?.length
      ? initialProperties
      : mode === 'publicCreate' ||
          mode === 'publicEdit' ||
          mode === 'publicStaticCreate'
        ? [emptyProperty()]
        : [],
  );
  const [admin, setAdmin] = useState<InternalAdminFields>(
    initialAdmin ?? emptyAdmin,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [savedClientId, setSavedClientId] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  function updateData(field: keyof ClientDataFields, value: string) {
    setData((d) => ({ ...d, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (mode === 'internal' && onSubmitInternal) {
        await onSubmitInternal({ data, properties, admin });
      } else if (onSubmitPublic) {
        const validProps = properties.filter(
          (p) => p.farmName.trim() && p.city.trim() && p.state,
        );
        if (validProps.length === 0) {
          throw new Error('Informe ao menos uma propriedade');
        }
        const result = await onSubmitPublic({
          data,
          properties: validProps.map((p) => ({
            ...p,
            state: p.state.toUpperCase(),
          })),
        });
        setSavedClientId(result.clientId);
        setSubmitted(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar');
    } finally {
      setLoading(false);
    }
  }

  async function handleFinalize() {
    if (!onFinalizePublic) return;
    setLoading(true);
    setError('');
    try {
      await onFinalizePublic();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao finalizar');
    } finally {
      setLoading(false);
    }
  }

  const isPublic =
    mode === 'publicCreate' ||
    mode === 'publicEdit' ||
    mode === 'publicStaticCreate';
  const publicMinProps = isPublic ? 1 : 0;

  return (
    <form onSubmit={handleSubmit} className="card registration-form">
      <ClientDataSection
        data={data}
        onChange={updateData}
        requireDocument={isPublic}
        requireAddress={isPublic}
      />

      <ClientPropertiesSection
        properties={properties}
        onChange={setProperties}
        minCount={publicMinProps}
      />

      {mode === 'internal' && (
        <section className="form-section">
          <h3 className="form-section-title">Administração</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <label>
              Observações
              <textarea
                value={admin.notes}
                onChange={(e) => setAdmin((a) => ({ ...a, notes: e.target.value }))}
                rows={3}
                style={{
                  background: 'var(--bg)',
                  color: 'var(--text)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  padding: '0.65rem 0.85rem',
                  width: '100%',
                  resize: 'vertical',
                }}
              />
            </label>
            <label>
              Responsável
              <select
                value={admin.responsibleId}
                onChange={(e) =>
                  setAdmin((a) => ({ ...a, responsibleId: e.target.value }))
                }
                style={{
                  background: 'var(--bg)',
                  color: 'var(--text)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  padding: '0.65rem 0.85rem',
                  width: '100%',
                }}
              >
                <option value="">Nenhum</option>
                {collaborators.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label style={{ flexDirection: 'row', alignItems: 'center', gap: '0.5rem' }}>
              <input
                type="checkbox"
                checked={admin.active}
                onChange={(e) => setAdmin((a) => ({ ...a, active: e.target.checked }))}
                style={{ width: 'auto' }}
              />
              Cliente ativo
            </label>
          </div>
        </section>
      )}

      {isPublic && (token || tenantSlug) && (
        <PublicDocumentUpload
          token={token}
          tenantSlug={tenantSlug}
          clientId={savedClientId}
          disabled={!savedClientId}
        />
      )}

      {error && <p className="error">{error}</p>}

      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', flexWrap: 'wrap' }}>
        {!submitted && (
          <button type="submit" className="primary" disabled={loading}>
            {loading ? 'Salvando...' : submitLabel ?? 'Salvar cadastro'}
          </button>
        )}
        {submitted && mode === 'publicEdit' && onFinalizePublic && (
          <button
            type="button"
            className="primary"
            disabled={loading}
            onClick={() => void handleFinalize()}
          >
            {loading ? 'Finalizando...' : 'Concluir e encerrar link'}
          </button>
        )}
        {submitted &&
          (mode === 'publicCreate' || mode === 'publicStaticCreate') && (
          <p style={{ fontSize: '0.9rem', color: 'var(--muted)' }}>
            Cadastro enviado. Você pode enviar documentos acima ou fechar esta página.
          </p>
        )}
      </div>
    </form>
  );
}
