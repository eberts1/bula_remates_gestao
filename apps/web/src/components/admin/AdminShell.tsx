'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ThemeToggle } from '@/components/ThemeToggle';

interface Props {
  children: React.ReactNode;
  title: string;
}

export function AdminShell({ children, title }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((data) => {
        if (!data.user || !data.isSuperAdmin) {
          router.push('/clients');
          return;
        }
        setUser(data.user);
        setReady(true);
      })
      .catch(() => router.push('/login'));
  }, [router]);

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  const nav = [
    { href: '/admin', label: 'Visão geral', exact: true },
    { href: '/admin/logs', label: 'Logs' },
    { href: '/admin/users', label: 'Usuários' },
  ];

  if (!ready) {
    return (
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '2rem 1rem' }}>
        <p style={{ color: 'var(--muted)' }}>Carregando painel admin…</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '2rem 1rem' }}>
      <header style={{ marginBottom: '1.5rem' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1rem',
          }}
        >
          <div>
            <h1 style={{ fontSize: '1.5rem' }}>{title}</h1>
            {user && (
              <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>
                Super-admin · {user.name}
              </p>
            )}
          </div>
          <div className="header-actions">
            <Link href="/clients" className="ghost" style={{ fontSize: '0.875rem' }}>
              Voltar ao app
            </Link>
            <ThemeToggle />
            <button className="ghost" onClick={logout}>
              Sair
            </button>
          </div>
        </div>
        <nav className="app-nav">
          {nav.map((item) => {
            const active = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={active ? 'active' : ''}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </header>
      {children}
    </div>
  );
}
