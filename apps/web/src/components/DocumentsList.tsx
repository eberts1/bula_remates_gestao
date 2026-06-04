'use client';

import { useCallback, useEffect, useState } from 'react';

interface Document {
  id: string;
  name: string;
  mimeType: string;
  sizeBytes: number | null;
  createdAt: string;
  createdBy?: { name: string };
}

interface StorageInfo {
  usedBytes: number;
  quotaBytes: number;
  documentCount: number;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DocumentsList({
  clientId,
  refreshKey,
}: {
  clientId: string;
  refreshKey: number;
}) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [storage, setStorage] = useState<StorageInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [docsRes, storageRes] = await Promise.all([
        fetch(`/api/documents?clientId=${clientId}`),
        fetch('/api/tenants/storage'),
      ]);
      const docs = await docsRes.json();
      const stor = await storageRes.json();
      if (docsRes.ok) setDocuments(docs.items ?? []);
      if (storageRes.ok) setStorage(stor);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  async function download(id: string) {
    const res = await fetch(`/api/documents/${id}/download-url`);
    const data = await res.json();
    if (!res.ok) return;
    window.open(data.downloadUrl, '_blank');
  }

  async function remove(id: string) {
    if (!confirm('Excluir este documento?')) return;
    await fetch(`/api/documents/${id}`, { method: 'DELETE' });
    void load();
  }

  if (loading) {
    return <p style={{ color: 'var(--muted)' }}>Carregando...</p>;
  }

  return (
    <div>
      {storage && (
        <p style={{ color: 'var(--muted)', fontSize: '0.875rem', marginBottom: '1rem' }}>
          Armazenamento: {formatBytes(storage.usedBytes)} / {formatBytes(storage.quotaBytes)}
          {' '}({storage.documentCount} documentos)
        </p>
      )}
      {documents.length === 0 ? (
        <p style={{ color: 'var(--muted)' }}>Nenhum documento ainda.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
              <th style={thStyle}>Nome</th>
              <th style={thStyle}>Tamanho</th>
              <th style={thStyle}>Enviado em</th>
              <th style={thStyle}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {documents.map((doc) => (
              <tr key={doc.id} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={tdStyle}>{doc.name}</td>
                <td style={tdStyle}>{doc.sizeBytes ? formatBytes(doc.sizeBytes) : '-'}</td>
                <td style={tdStyle}>
                  {new Date(doc.createdAt).toLocaleString('pt-BR')}
                </td>
                <td style={tdStyle}>
                  <button className="ghost" style={{ marginRight: 8 }} onClick={() => download(doc.id)}>
                    Baixar
                  </button>
                  <button className="ghost" onClick={() => remove(doc.id)}>
                    Excluir
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

const thStyle: React.CSSProperties = { padding: '0.75rem 0.5rem', color: 'var(--muted)', fontWeight: 500 };
const tdStyle: React.CSSProperties = { padding: '0.75rem 0.5rem' };
