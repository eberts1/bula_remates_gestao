'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuthMe } from '@/hooks/use-auth-me';
import type { ClientFormTokenItem } from '@/types/client';

interface Props {
  clientId?: string;
  showStaticLink?: boolean;
}

export function ClientFormLinksPanel({
  clientId,
  showStaticLink = false,
}: Props) {
  const [tokens, setTokens] = useState<ClientFormTokenItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastUrl, setLastUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const { data: authMe } = useAuthMe();

  const staticUrl = useMemo(() => {
    if (!showStaticLink || !authMe?.tenant?.slug) return '';
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    return `${origin}/cadastro/novo/${authMe.tenant.slug}`;
  }, [showStaticLink, authMe?.tenant?.slug]);

  const load = useCallback(async () => {
    if (!clientId) return;
    const res = await fetch(`/api/client-form-tokens?clientId=${clientId}`);
    const data = await res.json();
    if (res.ok) setTokens(data.items ?? []);
  }, [clientId]);

  useEffect(() => {
    if (clientId) void load();
  }, [load, clientId]);

  async function copyStatic() {
    if (!staticUrl) return;
    await navigator.clipboard.writeText(staticUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function generateEditLink() {
    if (!clientId) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/clients/${clientId}/form-tokens`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'edit' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? 'Erro ao gerar link');
      setLastUrl(data.url);
      await navigator.clipboard.writeText(data.url);
      void load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro');
    } finally {
      setLoading(false);
    }
  }

  async function revoke(id: string) {
    const res = await fetch(`/api/client-form-tokens/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const data = await res.json();
      setError(data.message ?? 'Erro ao revogar');
      return;
    }
    void load();
  }

  function formatExpiry(iso: string) {
    return new Date(iso).toLocaleString('pt-BR');
  }

  if (showStaticLink) {
    return (
      <div className="card" style={{ marginTop: '1rem' }}>
        <h3 style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>
          Link público para novos compradores
        </h3>
        <p style={{ fontSize: '0.875rem', color: 'var(--muted)', marginBottom: '1rem' }}>
          Link fixo — compartilhe com quem quer se cadastrar. Não expira. Cada envio
          cria um novo cliente no sistema.
        </p>
        {staticUrl ? (
          <>
            <p
              style={{
                fontSize: '0.875rem',
                wordBreak: 'break-all',
                marginBottom: '0.75rem',
                padding: '0.75rem',
                background: 'var(--bg)',
                borderRadius: 8,
                border: '1px solid var(--border)',
              }}
            >
              {staticUrl}
            </p>
            <button type="button" className="primary" onClick={() => void copyStatic()}>
              {copied ? 'Copiado!' : 'Copiar link'}
            </button>
          </>
        ) : (
          <p style={{ fontSize: '0.875rem', color: 'var(--muted)' }}>
            Faça login para ver o link da sua empresa.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="card" style={{ marginTop: '1rem' }}>
      <h3 style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>
        Solicitar completar cadastro
      </h3>
      <p style={{ fontSize: '0.875rem', color: 'var(--muted)', marginBottom: '1rem' }}>
        Gera um link temporário (72h) com os dados já preenchidos para o cliente
        completar. Uso único após conclusão.
      </p>

      <button
        type="button"
        className="primary"
        disabled={loading}
        onClick={() => void generateEditLink()}
      >
        Gerar link de edição
      </button>

      {lastUrl && (
        <p style={{ fontSize: '0.875rem', wordBreak: 'break-all', marginTop: '0.75rem' }}>
          Link copiado: {lastUrl}
        </p>
      )}

      {error && <p className="error">{error}</p>}

      {tokens.length > 0 && (
        <ul style={{ fontSize: '0.875rem', listStyle: 'none', padding: 0, marginTop: '1rem' }}>
          {tokens.map((t) => (
            <li
              key={t.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '0.5rem 0',
                borderTop: '1px solid var(--border)',
              }}
            >
              <span>
                Edição — expira {formatExpiry(t.expiresAt)}
                {t.usedAt ? ' (usado)' : ''}
              </span>
              <button type="button" className="ghost" onClick={() => void revoke(t.id)}>
                Revogar
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
