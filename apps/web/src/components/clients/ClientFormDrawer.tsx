'use client';

import { useEffect } from 'react';
import { ClientForm } from '@/components/clients/ClientForm';
import { ClientFormLinksPanel } from '@/components/clients/ClientFormLinksPanel';
import type { Client } from '@/types/client';

interface Props {
  open: boolean;
  client: Client | null;
  onClose: () => void;
  onSaved: () => void;
}

export function ClientFormDrawer({ open, client, onClose, onSaved }: Props) {
  useEffect(() => {
    if (!open) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }

    document.addEventListener('keydown', onKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  const title = client ? 'Editar cliente' : 'Novo cliente';

  function handleSaved() {
    onSaved();
    onClose();
  }

  return (
    <div className="client-drawer-root" role="presentation">
      <aside
        className="client-drawer client-drawer--fullscreen"
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <header className="client-drawer-header">
          <h2>{title}</h2>
          <button type="button" className="ghost client-drawer-close" onClick={onClose}>
            ✕
          </button>
        </header>

        <div className="client-drawer-body">
          <div className="client-drawer-inner">
            <ClientForm
              client={client}
              onSaved={handleSaved}
              onClear={onClose}
              showNewButton={false}
              hideTitle
            />

            {client ? (
              <ClientFormLinksPanel clientId={client.id} />
            ) : (
              <ClientFormLinksPanel showStaticLink />
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}
