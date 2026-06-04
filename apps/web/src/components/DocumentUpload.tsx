'use client';

import { useCallback, useState } from 'react';

interface Props {
  clientId: string;
  onUploaded: () => void;
}

export function DocumentUpload({ clientId, onUploaded }: Props) {
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState('');

  const uploadFile = useCallback(
    async (file: File) => {
      setError('');
      setProgress(0);

      try {
        const urlRes = await fetch('/api/documents/upload-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileName: file.name,
            mimeType: file.type || 'application/octet-stream',
            sizeBytes: file.size,
            clientId,
          }),
        });
        const urlData = await urlRes.json();
        if (!urlRes.ok) throw new Error(urlData.message ?? 'Erro ao iniciar upload');

        setProgress(30);

        const putRes = await fetch(urlData.uploadUrl, {
          method: 'PUT',
          headers: { 'Content-Type': file.type || 'application/octet-stream' },
          body: file,
        });

        if (!putRes.ok) throw new Error('Falha ao enviar arquivo');

        setProgress(70);

        const completeRes = await fetch(`/api/documents/${urlData.documentId}/complete`, {
          method: 'POST',
        });
        const completeData = await completeRes.json();
        if (!completeRes.ok) throw new Error(completeData.message ?? 'Erro ao finalizar');

        setProgress(100);
        onUploaded();
        setTimeout(() => setProgress(null), 800);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro no upload');
        setProgress(null);
      }
    },
    [clientId, onUploaded],
  );

  function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    void uploadFile(files[0]);
  }

  return (
    <div
      className="card"
      style={{
        borderStyle: dragging ? 'dashed' : 'solid',
        borderColor: dragging ? 'var(--accent)' : undefined,
        textAlign: 'center',
        padding: '2rem',
      }}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        handleFiles(e.dataTransfer.files);
      }}
    >
      <p style={{ marginBottom: '1rem', color: 'var(--muted)' }}>
        Arraste um arquivo ou clique para selecionar
      </p>
      <input
        type="file"
        id="file-input"
        style={{ display: 'none' }}
        onChange={(e) => handleFiles(e.target.files)}
      />
      <label htmlFor="file-input">
        <span className="primary" style={{ display: 'inline-block', padding: '0.7rem 1.2rem', borderRadius: 8, background: 'var(--accent)', color: 'var(--on-accent)', cursor: 'pointer' }}>
          Selecionar arquivo
        </span>
      </label>
      {progress !== null && (
        <div style={{ marginTop: '1rem' }}>
          <div style={{ height: 6, background: 'var(--border)', borderRadius: 4, overflow: 'hidden' }}>
            <div
              style={{
                height: '100%',
                width: `${progress}%`,
                background: 'var(--accent)',
                transition: 'width 0.3s',
              }}
            />
          </div>
          <p style={{ fontSize: '0.8rem', marginTop: '0.5rem', color: 'var(--muted)' }}>
            {progress < 100 ? 'Enviando...' : 'Concluído!'}
          </p>
        </div>
      )}
      {error && <p className="error" style={{ marginTop: '0.75rem' }}>{error}</p>}
    </div>
  );
}
