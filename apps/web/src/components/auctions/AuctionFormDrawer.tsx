'use client';

import { useEffect, useState } from 'react';
import { AuctionForm } from '@/components/auctions/AuctionForm';
import { useTenantIntentions } from '@/hooks/use-tenant-intentions';
import type { AuctionDetail } from '@/types/auction';
import {
  auctionToFormValue,
  emptyAuctionForm,
  type AuctionFormValue,
} from '@/types/auction';

interface Props {
  open: boolean;
  auction: AuctionDetail | null;
  loading?: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export function AuctionFormDrawer({
  open,
  auction,
  loading = false,
  onClose,
  onSaved,
}: Props) {
  const { data: intentions = [] } = useTenantIntentions();
  const [value, setValue] = useState<AuctionFormValue>(emptyAuctionForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setValue(auction ? auctionToFormValue(auction) : emptyAuctionForm());
    setError(null);
  }, [open, auction]);

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

  const title = auction ? 'Editar leilão' : 'Novo leilão';

  async function handleSave() {
    if (!value.name.trim()) {
      setError('Informe o nome do leilão');
      return;
    }

    setSaving(true);
    setError(null);

    const body = {
      name: value.name.trim(),
      scheduledAt: value.scheduledAt || undefined,
      location: value.location || undefined,
      status: value.status,
      animalType: value.animalType || undefined,
      animalSex: value.animalSex || undefined,
      livestockCategories: value.livestockCategories,
      targetIntentionCode: value.targetIntentionCode || undefined,
      offersNotes: value.offersNotes || undefined,
      isBulaRemates: value.isBulaRemates,
      active: value.active,
    };

    try {
      const url = auction ? `/api/auctions/${auction.id}` : '/api/auctions';
      const method = auction ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? 'Erro ao salvar');
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="client-drawer-root" role="presentation">
      <aside
        className="client-drawer"
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
          {loading ? (
            <p>Carregando leilão…</p>
          ) : (
            <AuctionForm
              value={value}
              intentions={intentions}
              onChange={setValue}
            />
          )}
          {error && <p className="error">{error}</p>}
        </div>

        <footer className="client-drawer-footer">
          <button type="button" className="ghost" onClick={onClose}>
            Cancelar
          </button>
          <button type="button" onClick={handleSave} disabled={saving || loading}>
            {saving ? 'Salvando…' : 'Salvar'}
          </button>
        </footer>
      </aside>
    </div>
  );
}
