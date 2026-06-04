'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ClientRegistrationForm } from '@/components/clients/ClientRegistrationForm';
import type { ClientDataFields } from '@/components/clients/ClientDataSection';
import type { ClientProperty, PublicFormPayload } from '@/types/client';
import { emptyProperty } from '@/types/client';

export default function PublicCadastroPage() {
  const params = useParams();
  const token = params.token as string;
  const [payload, setPayload] = useState<PublicFormPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/public/client-forms/${encodeURIComponent(token)}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.message ?? 'Link inválido');
        setPayload(data);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Link inválido ou expirado');
      })
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <main className="public-cadastro-page">
        <p>Carregando...</p>
      </main>
    );
  }

  if (error || !payload) {
    return (
      <main className="public-cadastro-page">
        <div className="card">
          <h1>Cadastro indisponível</h1>
          <p className="error">{error || 'Link inválido ou expirado'}</p>
        </div>
      </main>
    );
  }

  const initialData: ClientDataFields = payload.client
    ? {
        name: payload.client.name,
        document: payload.client.document,
        email: payload.client.email,
        phone: payload.client.phone,
        addressFull: payload.client.addressFull,
      }
    : {
        name: '',
        document: '',
        email: '',
        phone: '',
        addressFull: '',
      };

  const initialProperties: ClientProperty[] =
    payload.properties.length > 0
      ? payload.properties.map((p) => ({
          id: p.id,
          farmName: p.farmName,
          city: p.city,
          state: p.state,
          routeNotes: p.routeNotes ?? '',
          phone: p.phone ?? '',
          ie: p.ie ?? '',
          nirf: p.nirf ?? '',
        }))
      : [emptyProperty()];

  const mode = payload.type === 'create' ? 'publicCreate' : 'publicEdit';
  const title =
    payload.type === 'create'
      ? 'Novo cadastro'
      : 'Completar seu cadastro';

  return (
    <main className="public-cadastro-page">
      <header className="public-cadastro-header">
        <h1>{title}</h1>
        <p>{payload.tenantName}</p>
      </header>

      <ClientRegistrationForm
        mode={mode}
        token={token}
        initialData={initialData}
        initialProperties={initialProperties}
        submitLabel={payload.type === 'create' ? 'Enviar cadastro' : 'Salvar dados'}
        onSubmitPublic={async ({ data, properties }) => {
          const res = await fetch(
            `/api/public/client-forms/${encodeURIComponent(token)}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                name: data.name,
                document: data.document,
                email: data.email || undefined,
                phone: data.phone || undefined,
                addressFull: data.addressFull,
                properties,
              }),
            },
          );
          const result = await res.json();
          if (!res.ok) throw new Error(result.message ?? 'Erro ao enviar');
          return { clientId: result.clientId as string };
        }}
        onFinalizePublic={
          payload.type === 'edit'
            ? async () => {
                const res = await fetch(
                  `/api/public/client-forms/${encodeURIComponent(token)}/finalize`,
                  { method: 'POST' },
                );
                const result = await res.json();
                if (!res.ok) throw new Error(result.message ?? 'Erro ao finalizar');
              }
            : undefined
        }
      />
    </main>
  );
}
