'use client';



import Link from 'next/link';

import { usePathname, useRouter } from 'next/navigation';

import { useEffect, useState } from 'react';

import { ThemeToggle } from '@/components/ThemeToggle';



interface Props {

  children: React.ReactNode;

  title: string;

}



export function AppShell({ children, title }: Props) {

  const router = useRouter();

  const pathname = usePathname();

  const [user, setUser] = useState<{ name: string; email: string } | null>(null);

  const [tenant, setTenant] = useState<{ name: string } | null>(null);



  useEffect(() => {

    fetch('/api/auth/me')

      .then((r) => r.json())

      .then((data) => {

        if (data.user) {

          setUser(data.user);

          setTenant(data.tenant);

        } else {

          router.push('/login');

        }

      })

      .catch(() => router.push('/login'));

  }, [router]);



  async function logout() {

    await fetch('/api/auth/logout', { method: 'POST' });

    router.push('/login');

    router.refresh();

  }



  const nav = [

    { href: '/clients', label: 'Clientes' },

    { href: '/clients/import', label: 'Importar' },

    { href: '/collaborators', label: 'Colaboradores' },

  ];



  return (

    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '2rem 1rem' }}>

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

            {tenant && user && (

              <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>

                {tenant.name} · {user.name}

              </p>

            )}

          </div>

          <div className="header-actions">

            <ThemeToggle />

            <button className="ghost" onClick={logout}>

              Sair

            </button>

          </div>

        </div>

        <nav className="app-nav">

          {nav.map((item) => (

            <Link

              key={item.href}

              href={item.href}

              className={pathname.startsWith(item.href) ? 'active' : ''}

            >

              {item.label}

            </Link>

          ))}

        </nav>

      </header>

      {children}

    </div>

  );

}


