'use client';

import { useEffect, useState } from 'react';
import type { AuctionListItem } from '@/types/auction';
import type { ClientListItem } from '@/types/client';

interface Props {
  columnId: string;
  auctions: AuctionListItem[];
  loading: boolean;
  onCancel: () => void;
  onSubmit: (data: {
    columnId: string;
    clientId: string;
    auctionId?: string;
    title: string;
    description?: string;
  }) => void;
}

export function AttendanceAddActionForm({
  columnId,
  auctions,
  loading,
  onCancel,
  onSubmit,
}: Props) {
  const [clientSearch, setClientSearch] = useState('');
  const [clients, setClients] = useState<ClientListItem[]>([]);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedClientName, setSelectedClientName] = useState('');
  const [auctionId, setAuctionId] = useState('');
  const [title, setTitle] = useState('Atendimento');
  const [description, setDescription] = useState('');
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!clientSearch.trim() || clientSearch.length < 2) {
      setClients([]);
      return;
    }

    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(
          `/api/clients?q=${encodeURIComponent(clientSearch)}&limit=10`,
        );
        const data = await res.json();
        if (res.ok) setClients(data.items ?? []);
      } catch {
        setClients([]);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(t);
  }, [clientSearch]);

  function selectClient(client: ClientListItem) {
    setSelectedClientId(client.id);
    setSelectedClientName(client.name);
    setClientSearch(client.name);
    setClients([]);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedClientId || !title.trim()) return;

    onSubmit({
      columnId,
      clientId: selectedClientId,
      auctionId: auctionId || undefined,
      title: title.trim(),
      description: description.trim() || undefined,
    });
  }

  return (
    <form className="attendance-add-form" onSubmit={handleSubmit}>
      <label>
        Cliente
        <input
          type="search"
          placeholder="Buscar cliente..."
          value={clientSearch}
          onChange={(e) => {
            setClientSearch(e.target.value);
            if (selectedClientId && e.target.value !== selectedClientName) {
              setSelectedClientId('');
              setSelectedClientName('');
            }
          }}
        />
      </label>

      {searching && <p className="attendance-add-form-hint">Buscando...</p>}

      {clients.length > 0 && (
        <ul className="attendance-client-suggestions">
          {clients.map((client) => (
            <li key={client.id}>
              <button type="button" onClick={() => selectClient(client)}>
                {client.name}
                {client.phone && <small>{client.phone}</small>}
              </button>
            </li>
          ))}
        </ul>
      )}

      <label>
        Leilão (opcional)
        <select value={auctionId} onChange={(e) => setAuctionId(e.target.value)}>
          <option value="">Sem leilão</option>
          {auctions.map((auction) => (
            <option key={auction.id} value={auction.id}>
              {auction.name}
            </option>
          ))}
        </select>
      </label>

      <label>
        Título da ação
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ex: Atendimento"
          required
        />
      </label>

      <label>
        Descrição (opcional)
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          placeholder="Ex: Enviar catálogo e separar o melhor do maternal"
        />
      </label>

      <div className="attendance-add-form-actions">
        <button type="button" className="ghost" onClick={onCancel}>
          Cancelar
        </button>
        <button type="submit" disabled={loading || !selectedClientId}>
          Adicionar
        </button>
      </div>
    </form>
  );
}
