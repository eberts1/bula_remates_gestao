'use client';

import {
  CLIENT_EXPORT_PURPOSES,
  CLIENT_EXPORT_PURPOSE_LABELS,
  clientExportRequestSchema,
} from '@docs/shared';
import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

import type {
  ClientExportFormValues,
  ClientExportRequest,
} from '@/types/client-export';
import { EMPTY_EXPORT_FORM } from '@/types/client-export';

interface Props {
  open: boolean;
  clientCount: number;
  onClose: () => void;
  onConfirm: (payload: ClientExportRequest) => Promise<void>;
}

export function ClientExportDialog({
  open,
  clientCount,
  onClose,
  onConfirm,
}: Props) {
  const [form, setForm] = useState<ClientExportFormValues>(EMPTY_EXPORT_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const validationError = useMemo(() => {
    const parsed = clientExportRequestSchema.safeParse({
      purpose: form.purpose,
      destination: form.destination || undefined,
      recipientName: form.recipientName || undefined,
      notes: form.notes || undefined,
    });
    if (parsed.success) return '';
    return parsed.error.issues[0]?.message ?? 'Preencha os campos obrigatórios';
  }, [form]);

  if (!open) return null;

  function updateField<K extends keyof ClientExportFormValues>(
    key: K,
    value: ClientExportFormValues[K],
  ) {
    setForm((current) => ({ ...current, [key]: value }));
    setError('');
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      await onConfirm({
        purpose: form.purpose,
        destination: form.destination.trim() || undefined,
        recipientName: form.recipientName.trim() || undefined,
        notes: form.notes.trim() || undefined,
      });
      setForm(EMPTY_EXPORT_FORM);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao exportar');
    } finally {
      setSubmitting(false);
    }
  }

  return createPortal(
    <div className="export-dialog-overlay" onClick={onClose}>
      <div
        className="export-dialog-panel"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="export-dialog-title"
      >
        <div className="export-dialog-header">
          <div>
            <h2 id="export-dialog-title">Registrar exportação</h2>
            <p className="export-dialog-subtitle">
              Informe para onde vão os {clientCount} contato(s) antes de baixar o
              arquivo.
            </p>
          </div>
          <button type="button" className="ghost" onClick={onClose}>
            Fechar
          </button>
        </div>

        <form className="export-dialog-body export-dialog-form" onSubmit={handleSubmit}>
          <label className="export-dialog-field">
            <span>Finalidade</span>
            <select
              value={form.purpose}
              onChange={(event) =>
                updateField(
                  'purpose',
                  event.target.value as ClientExportFormValues['purpose'],
                )
              }
            >
              {CLIENT_EXPORT_PURPOSES.map((purpose) => (
                <option key={purpose} value={purpose}>
                  {CLIENT_EXPORT_PURPOSE_LABELS[purpose]}
                </option>
              ))}
            </select>
          </label>

          {(form.purpose === 'message_dispatcher' ||
            form.purpose === 'internal' ||
            form.purpose === 'other') && (
            <label className="export-dialog-field">
              <span>
                {form.purpose === 'message_dispatcher'
                  ? 'Leilão ou campanha'
                  : 'Destino / referência'}
              </span>
              <input
                type="text"
                placeholder={
                  form.purpose === 'message_dispatcher'
                    ? 'Ex.: Leilão ETB Estância Jun/2026'
                    : 'Ex.: backup mensal, análise interna...'
                }
                value={form.destination}
                onChange={(event) => updateField('destination', event.target.value)}
              />
            </label>
          )}

          {(form.purpose === 'requested_listing' ||
            form.purpose === 'other') && (
            <label className="export-dialog-field">
              <span>
                {form.purpose === 'requested_listing'
                  ? 'Quem solicitou'
                  : 'Solicitante (opcional)'}
              </span>
              <input
                type="text"
                placeholder="Ex.: João Silva — consultor"
                value={form.recipientName}
                onChange={(event) =>
                  updateField('recipientName', event.target.value)
                }
              />
            </label>
          )}

          <label className="export-dialog-field">
            <span>Observações</span>
            <textarea
              rows={3}
              placeholder="Detalhes extras: canal usado, prazo, observações..."
              value={form.notes}
              onChange={(event) => updateField('notes', event.target.value)}
            />
          </label>

          <div className="export-dialog-summary card">
            <strong>Resumo</strong>
            <p>
              Serão exportados <strong>{clientCount}</strong> cadastro(s) com os
              filtros atuais.
            </p>
          </div>

          {error && <p className="export-error">{error}</p>}
        </form>

        <div className="export-dialog-footer">
          <button type="button" className="ghost" onClick={onClose}>
            Cancelar
          </button>
          <button
            type="submit"
            className="primary"
            disabled={submitting || Boolean(validationError)}
            onClick={handleSubmit}
          >
            {submitting ? 'Exportando…' : 'Confirmar e baixar Excel'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
