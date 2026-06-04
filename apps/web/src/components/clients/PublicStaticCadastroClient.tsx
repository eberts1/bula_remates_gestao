'use client';

import { BulaLogo } from '@/components/BulaLogo';
import { ClientRegistrationForm } from '@/components/clients/ClientRegistrationForm';
import { emptyProperty } from '@/types/client';

interface Props {
  tenantSlug: string;
  tenantName: string;
}

export function PublicStaticCadastroClient({ tenantSlug, tenantName }: Props) {
  return (
    <main className="public-cadastro-page">
      <header className="public-cadastro-header">
        {tenantSlug === 'bula' && <BulaLogo />}
        <h1>Cadastro de comprador</h1>
        <p>{tenantName}</p>
        <p style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}>
          Preencha seus dados e propriedades. Após enviar, você poderá anexar documentos.
        </p>
      </header>

      <ClientRegistrationForm
        mode="publicStaticCreate"
        tenantSlug={tenantSlug}
        initialProperties={[emptyProperty()]}
        submitLabel="Enviar cadastro"
        onSubmitPublic={async ({ data, properties }) => {
          const res = await fetch(
            `/api/public/register/${encodeURIComponent(tenantSlug)}`,
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
      />
    </main>
  );
}
