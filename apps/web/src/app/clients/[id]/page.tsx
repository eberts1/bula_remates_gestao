'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { ClientDetailView } from '@/components/clients/ClientDetailView';
import { ClientForm } from '@/components/clients/ClientForm';
import { ClientFormLinksPanel } from '@/components/clients/ClientFormLinksPanel';
import { DocumentUpload } from '@/components/DocumentUpload';
import { DocumentsList } from '@/components/DocumentsList';
import type { Client } from '@/types/client';

export default function ClientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const clientId = params.id as string;
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const loadClient = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/clients/${clientId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? 'Erro ao carregar cliente');
      setClient(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar cliente');
      setClient(null);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    void loadClient();
  }, [loadClient]);

  function handleSaved() {
    void loadClient();
    setEditing(false);
  }

  return (
    <AppShell title={client?.name ?? 'Cliente'}>
      <Link
        href="/clients"
        style={{ fontSize: '0.875rem', display: 'inline-block', marginBottom: '1rem' }}
      >
        ← Voltar para clientes
      </Link>

      {loading && (
        <p style={{ color: 'var(--muted)', marginBottom: '1.5rem' }}>Carregando cliente...</p>
      )}

      {error && !loading && <p className="error">{error}</p>}

      {client && !loading && (
        <>
          {editing ? (
            <ClientForm
              client={client}
              onSaved={handleSaved}
              onClear={() => setEditing(false)}
              showNewButton={false}
              onDeleted={() => router.push('/clients')}
            />
          ) : (
            <>
              <ClientDetailView client={client} onEdit={() => setEditing(true)} />
              <ClientFormLinksPanel clientId={clientId} />
            </>
          )}
        </>
      )}

      <section style={{ marginBottom: '2rem', marginTop: '1.5rem' }}>
        <h2 style={{ fontSize: '1rem', marginBottom: '1rem', color: 'var(--muted)' }}>
          Enviar arquivo
        </h2>
        <DocumentUpload
          clientId={clientId}
          onUploaded={() => setRefreshKey((k) => k + 1)}
        />
      </section>

      <section>
        <h2 style={{ fontSize: '1rem', marginBottom: '1rem', color: 'var(--muted)' }}>
          Documentos do cliente
        </h2>
        <DocumentsList clientId={clientId} refreshKey={refreshKey} />
      </section>
    </AppShell>
  );
}
