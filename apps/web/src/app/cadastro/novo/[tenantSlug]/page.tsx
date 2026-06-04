import { PublicStaticCadastroClient } from '@/components/clients/PublicStaticCadastroClient';
import { getPublicTenant, PublicApiError } from '@/lib/public-api';
import Link from 'next/link';

interface PageProps {
  params: Promise<{ tenantSlug: string }>;
}

export default async function PublicStaticCadastroPage({ params }: PageProps) {
  const { tenantSlug } = await params;

  try {
    const tenant = await getPublicTenant(tenantSlug);
    return (
      <PublicStaticCadastroClient
        tenantSlug={tenantSlug}
        tenantName={tenant.tenantName}
      />
    );
  } catch (e) {
    const message =
      e instanceof PublicApiError
        ? e.message
        : e instanceof Error
          ? e.message
          : 'Página não encontrada';

    const isNotFound = e instanceof PublicApiError && e.status === 404;

    return (
      <main className="public-cadastro-page">
        <div className="card">
          <h1>{isNotFound ? 'Empresa não encontrada' : 'Cadastro indisponível'}</h1>
          <p className="error">{message}</p>
          {!isNotFound && (
            <p style={{ fontSize: '0.875rem', color: 'var(--muted)', marginTop: '1rem' }}>
              Se o sistema acabou de iniciar, aguarde alguns segundos e{' '}
              <Link href={`/cadastro/novo/${tenantSlug}`}>recarregue a página</Link>.
            </p>
          )}
        </div>
      </main>
    );
  }
}
