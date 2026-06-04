'use client';

import { useEffect, useState } from 'react';
import type { Client, CollaboratorOption } from '@/types/client';
import { ClientRegistrationForm } from './ClientRegistrationForm';
import type { ClientDataFields } from './ClientDataSection';
import type { ClientProperty } from '@/types/client';
import {
  collectClientPhones,
  distributePhonesForSave,
  splitNotesAndExtraPhones,
} from '@/lib/client-phones';

interface Props {
  client: Client | null;
  onSaved: () => void;
  onClear: () => void;
  showNewButton?: boolean;
  hideTitle?: boolean;
  onDeleted?: () => void;
}

export function ClientForm({
  client,
  onSaved,
  onClear,
  showNewButton = true,
  hideTitle = false,
  onDeleted,
}: Props) {
  const [collaborators, setCollaborators] = useState<CollaboratorOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/collaborators?active=true&limit=100')
      .then((r) => r.json())
      .then((data) => {
        if (data.items) setCollaborators(data.items);
      })
      .catch(() => {});
  }, []);

  const phoneFields = client
    ? collectClientPhones({
        phone: client.phone,
        properties: client.properties,
        notes: client.notes,
      })
    : null;

  const initialData: ClientDataFields | undefined = client
    ? {
        name: client.name,
        document: client.document ?? '',
        email: client.email ?? '',
        addressFull: client.addressFull ?? '',
        ...(phoneFields ?? { phone: '', phone2: '', extraPhones: '' }),
      }
    : undefined;

  const initialProperties: ClientProperty[] | undefined = client?.properties?.map(
    (p, i) => ({
      id: p.id,
      farmName: p.farmName,
      city: p.city,
      state: p.state,
      routeNotes: p.routeNotes ?? '',
      phone:
        i === 0 && phoneFields && (p.phone ?? '') === phoneFields.phone2
          ? ''
          : (p.phone ?? ''),
      ie: p.ie ?? '',
      nirf: p.nirf ?? '',
    }),
  );

  async function handleSubmit({
    data,
    properties,
    admin,
  }: {
    data: ClientDataFields;
    properties: ClientProperty[];
    admin: { notes: string; active: boolean; responsibleId: string };
  }) {
    setLoading(true);
    setError('');

    const { notesWithoutPhones } = splitNotesAndExtraPhones(admin.notes);
    const distributed = distributePhonesForSave({
      phone: data.phone,
      phone2: data.phone2,
      extraPhones: data.extraPhones,
      properties: properties.filter(
        (p) => p.farmName.trim() || p.city.trim() || p.state,
      ),
      adminNotes: notesWithoutPhones,
    });

    const body = {
      name: data.name,
      document: data.document || undefined,
      email: data.email || undefined,
      phone: distributed.clientPhone,
      addressFull: data.addressFull || undefined,
      notes: distributed.notes,
      active: admin.active,
      responsibleId: admin.responsibleId || null,
      properties: distributed.properties.map((p) => ({
        farmName: p.farmName,
        city: p.city,
        state: p.state,
        routeNotes: p.routeNotes || undefined,
        phone: p.phone || undefined,
        ie: p.ie || undefined,
        nirf: p.nirf || undefined,
      })),
    };

    try {
      const url = client ? `/api/clients/${client.id}` : '/api/clients';
      const method = client ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.message ?? 'Erro ao salvar');
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar');
      throw err;
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!client || client.isDefault) return;
    if (!confirm('Excluir este cliente?')) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/clients/${client.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? 'Erro ao excluir');
      if (onDeleted) {
        onDeleted();
      } else {
        onClear();
        onSaved();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao excluir');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={hideTitle ? '' : 'card'}>
      {!hideTitle && (
        <h2 style={{ fontSize: '1rem', marginBottom: '1rem' }}>
          {client ? 'Editar cliente' : 'Novo cliente'}
        </h2>
      )}
      {client && !client.isComplete && (
        <p
          style={{
            fontSize: '0.875rem',
            color: 'var(--warning, #b8860b)',
            marginBottom: '0.75rem',
          }}
        >
          Cadastro incompleto — envie um link para o cliente completar os dados.
        </p>
      )}
      <ClientRegistrationForm
        key={client?.id ?? 'new'}
        mode="internal"
        initialData={initialData}
        initialProperties={initialProperties}
        initialAdmin={
          client
            ? {
                notes: splitNotesAndExtraPhones(client.notes).notesWithoutPhones,
                active: client.active,
                responsibleId: client.responsibleId ?? '',
              }
            : undefined
        }
        collaborators={collaborators}
        onSubmitInternal={handleSubmit}
        submitLabel={loading ? 'Salvando...' : 'Salvar'}
      />
      {error && <p className="error">{error}</p>}
      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', flexWrap: 'wrap' }}>
        <button type="button" className="ghost" onClick={onClear}>
          {showNewButton ? 'Novo' : 'Cancelar'}
        </button>
        {client && !client.isDefault && (
          <button type="button" className="ghost" onClick={() => void handleDelete()} disabled={loading}>
            Excluir
          </button>
        )}
      </div>
    </div>
  );
}
