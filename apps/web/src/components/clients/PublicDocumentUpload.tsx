'use client';

import { useRef, useState } from 'react';

interface Props {
  clientId: string | null;
  disabled?: boolean;
  token?: string;
  tenantSlug?: string;
}

export function PublicDocumentUpload({
  token,
  tenantSlug,
  clientId,
  disabled,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState<string[]>([]);
  const [error, setError] = useState('');

  function onSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? []);
    setFiles((prev) => [...prev, ...selected]);
    e.target.value = '';
  }

  async function uploadAll() {
    if (!clientId || files.length === 0) return;
    setUploading(true);
    setError('');

    try {
      for (const file of files) {
        const uploadUrlPath = tenantSlug
          ? `/api/public/register/${encodeURIComponent(tenantSlug)}/documents/upload-url`
          : `/api/public/client-forms/${encodeURIComponent(token!)}/documents/upload-url`;
        const completeUrlPath = (docId: string) =>
          tenantSlug
            ? `/api/public/register/${encodeURIComponent(tenantSlug)}/documents/${docId}/complete`
            : `/api/public/client-forms/${encodeURIComponent(token!)}/documents/${docId}/complete`;

        const urlRes = await fetch(uploadUrlPath, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clientId,
            fileName: file.name,
            mimeType: file.type || 'application/octet-stream',
            sizeBytes: file.size,
          }),
        });
        const urlData = await urlRes.json();
        if (!urlRes.ok) throw new Error(urlData.message ?? 'Erro ao preparar upload');

        const putRes = await fetch(urlData.uploadUrl, {
          method: 'PUT',
          headers: { 'Content-Type': file.type || 'application/octet-stream' },
          body: file,
        });
        if (!putRes.ok) throw new Error('Falha ao enviar arquivo');

        const completeRes = await fetch(completeUrlPath(urlData.documentId), {
          method: 'POST',
        });
        const completeData = await completeRes.json();
        if (!completeRes.ok) {
          throw new Error(completeData.message ?? 'Erro ao finalizar upload');
        }
        setDone((d) => [...d, file.name]);
      }
      setFiles([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro no upload');
    } finally {
      setUploading(false);
    }
  }

  return (
    <section className="form-section">
      <h3 className="form-section-title">Documentos</h3>
      <p style={{ fontSize: '0.875rem', color: 'var(--muted)', marginBottom: '0.75rem' }}>
        Envie PDF, imagens ou planilhas com seus dados (máx. 100 MB por arquivo).
      </p>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx,.txt"
        onChange={onSelect}
        disabled={disabled || !clientId || uploading}
        style={{ marginBottom: '0.75rem' }}
      />
      {files.length > 0 && (
        <ul style={{ fontSize: '0.875rem', marginBottom: '0.75rem' }}>
          {files.map((f) => (
            <li key={f.name}>{f.name}</li>
          ))}
        </ul>
      )}
      {done.length > 0 && (
        <p style={{ fontSize: '0.875rem', color: 'var(--success, #2d6a4f)' }}>
          Enviados: {done.join(', ')}
        </p>
      )}
      {!clientId && (
        <p style={{ fontSize: '0.875rem', color: 'var(--muted)' }}>
          Salve o cadastro antes de enviar documentos.
        </p>
      )}
      {error && <p className="error">{error}</p>}
      <button
        type="button"
        className="primary"
        disabled={disabled || !clientId || files.length === 0 || uploading}
        onClick={() => void uploadAll()}
      >
        {uploading ? 'Enviando...' : 'Enviar documentos'}
      </button>
    </section>
  );
}
