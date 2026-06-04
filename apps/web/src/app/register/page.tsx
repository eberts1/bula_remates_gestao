'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';

import { ThemeToggle } from '@/components/ThemeToggle';

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    tenantName: '',
    tenantSlug: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function update(field: string, value: string) {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === 'tenantName' && !prev.tenantSlug) {
        next.tenantSlug = value
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '');
      }
      return next;
    });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? 'Erro ao registrar');
      router.push('/clients');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao registrar');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page" style={styles.main}>
      <div className="theme-toggle-wrap">
        <ThemeToggle />
      </div>
      <div className="card" style={styles.card}>
        <h1 style={styles.title}>Criar conta</h1>
        <p style={styles.subtitle}>Registre sua empresa e comece a enviar documentos</p>
        <form onSubmit={handleSubmit} style={styles.form}>
          <label>
            Seu nome
            <input value={form.name} onChange={(e) => update('name', e.target.value)} required />
          </label>
          <label>
            E-mail
            <input
              type="email"
              value={form.email}
              onChange={(e) => update('email', e.target.value)}
              required
            />
          </label>
          <label>
            Senha (mín. 8 caracteres)
            <input
              type="password"
              value={form.password}
              onChange={(e) => update('password', e.target.value)}
              required
              minLength={8}
            />
          </label>
          <label>
            Nome da empresa
            <input
              value={form.tenantName}
              onChange={(e) => update('tenantName', e.target.value)}
              required
            />
          </label>
          <label>
            Slug da empresa (URL)
            <input
              value={form.tenantSlug}
              onChange={(e) => update('tenantSlug', e.target.value)}
              required
              pattern="^[a-z0-9-]+$"
              title="Apenas letras minúsculas, números e hífens"
            />
          </label>
          {error && <p className="error">{error}</p>}
          <button type="submit" className="primary" disabled={loading}>
            {loading ? 'Criando...' : 'Criar conta'}
          </button>
        </form>
        <p style={styles.footer}>
          Já tem conta? <Link href="/login">Entrar</Link>
        </p>
      </div>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  main: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    padding: '1rem',
  },
  card: { width: '100%', maxWidth: 440 },
  title: { fontSize: '1.5rem', marginBottom: '0.25rem' },
  subtitle: { color: 'var(--muted)', marginBottom: '1.5rem', fontSize: '0.9rem' },
  form: { display: 'flex', flexDirection: 'column', gap: '1rem' },
  footer: { marginTop: '1.25rem', fontSize: '0.875rem', color: 'var(--muted)' },
};
