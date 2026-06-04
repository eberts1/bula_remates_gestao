'use client';

export interface ClientDataFields {
  name: string;
  document: string;
  email: string;
  phone: string;
  addressFull: string;
}

interface Props {
  data: ClientDataFields;
  onChange: (field: keyof ClientDataFields, value: string) => void;
  requireDocument?: boolean;
  requireAddress?: boolean;
}

export function ClientDataSection({
  data,
  onChange,
  requireDocument = false,
  requireAddress = false,
}: Props) {
  return (
    <section className="form-section">
      <h3 className="form-section-title">Dados do cliente</h3>
      <div className="form-section-grid">
        <label>
          Nome *
          <input
            required
            value={data.name}
            onChange={(e) => onChange('name', e.target.value)}
          />
        </label>
        <label>
          CPF/CNPJ {requireDocument ? '*' : ''}
          <input
            required={requireDocument}
            value={data.document}
            onChange={(e) => onChange('document', e.target.value)}
            placeholder={requireDocument ? '' : 'Opcional no cadastro interno'}
          />
        </label>
        <label>
          E-mail
          <input
            type="email"
            value={data.email}
            onChange={(e) => onChange('email', e.target.value)}
          />
        </label>
        <label>
          Telefone
          <input
            value={data.phone}
            onChange={(e) => onChange('phone', e.target.value)}
          />
        </label>
        <label className="form-full-width">
          Endereço completo {requireAddress ? '*' : ''}
          <textarea
            required={requireAddress}
            value={data.addressFull}
            onChange={(e) => onChange('addressFull', e.target.value)}
            rows={3}
            style={{
              background: 'var(--bg)',
              color: 'var(--text)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              padding: '0.65rem 0.85rem',
              width: '100%',
              resize: 'vertical',
            }}
          />
        </label>
      </div>
    </section>
  );
}
