'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { BulaLogo } from '@/components/BulaLogo';
import { ThemeToggle } from '@/components/ThemeToggle';

interface Props {
  children: React.ReactNode;
  title: string;
}

interface NavItem {
  href: string;
  label: string;
  icon: string;
}

const CLIENTS_RESERVED_SEGMENTS = new Set([
  'dashboard',
  'import',
  'export',
  'hygiene',
]);

function isNavActive(pathname: string, href: string): boolean {
  if (href === '/clients') {
    if (pathname === '/clients') return true;
    const match = pathname.match(/^\/clients\/([^/]+)$/);
    if (!match) return false;
    return !CLIENTS_RESERVED_SEGMENTS.has(match[1]);
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({ children, title }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);
  const [tenant, setTenant] = useState<{ name: string } | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((data) => {
        if (data.user) {
          setUser(data.user);
          setTenant(data.tenant);
          setIsSuperAdmin(Boolean(data.isSuperAdmin));
        } else {
          router.push('/login');
        }
      })
      .catch(() => router.push('/login'));
  }, [router]);

  const closeMenu = useCallback(() => setMenuOpen(false), []);

  useEffect(() => {
    closeMenu();
  }, [pathname, closeMenu]);

  useEffect(() => {
    if (!menuOpen) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') closeMenu();
    }

    document.addEventListener('keydown', onKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
    };
  }, [menuOpen, closeMenu]);

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  const nav: NavItem[] = [
    { href: '/clients', label: 'Clientes', icon: '👥' },
    { href: '/clients/dashboard', label: 'Dashboard', icon: '📊' },
    { href: '/clients/import', label: 'Importar', icon: '📥' },
    { href: '/clients/export', label: 'Exportar', icon: '📤' },
    { href: '/clients/hygiene', label: 'Higienizar', icon: '🧹' },
    { href: '/collaborators', label: 'Colaboradores', icon: '👤' },
    ...(isSuperAdmin ? [{ href: '/admin', label: 'Admin', icon: '⚙️' }] : []),
  ];

  return (
    <div className={`app-layout${menuOpen ? ' app-layout--menu-open' : ''}`}>
      {menuOpen && (
        <button
          type="button"
          className="app-drawer-overlay"
          aria-label="Fechar menu"
          onClick={closeMenu}
        />
      )}

      <aside className="app-sidebar" aria-label="Navegação principal">
        <div className="app-sidebar-brand">
          <BulaLogo className="app-sidebar-logo" />
          {tenant && <p className="app-sidebar-tenant">{tenant.name}</p>}
        </div>

        <nav className="app-nav">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={isNavActive(pathname, item.href) ? 'active' : ''}
              onClick={closeMenu}
            >
              <span className="app-nav-icon" aria-hidden="true">
                {item.icon}
              </span>
              <span className="app-nav-label">{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="app-sidebar-footer">
          {user && (
            <div className="app-sidebar-user">
              <span className="app-sidebar-user-name">{user.name}</span>
              <span className="app-sidebar-user-email">{user.email}</span>
            </div>
          )}
          <div className="app-sidebar-actions">
            <ThemeToggle />
            <button type="button" className="ghost" onClick={logout}>
              Sair
            </button>
          </div>
        </div>
      </aside>

      <div className="app-main">
        <header className="app-topbar">
          <button
            type="button"
            className="app-menu-button"
            aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span className="app-menu-icon" aria-hidden="true" />
          </button>
          <div className="app-topbar-title">
            <h1>{title}</h1>
            {tenant && user && (
              <p className="app-topbar-subtitle">
                {tenant.name} · {user.name}
              </p>
            )}
          </div>
          <div className="app-topbar-actions">
            <ThemeToggle />
          </div>
        </header>

        <div className="app-page-header">
          <div>
            <h1 className="app-page-title">{title}</h1>
            {tenant && user && (
              <p className="app-page-subtitle">
                {tenant.name} · {user.name}
              </p>
            )}
          </div>
        </div>

        <main className="app-content">{children}</main>
      </div>
    </div>
  );
}
