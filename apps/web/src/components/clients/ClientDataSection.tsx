'use client';

export interface ClientDataFields {
  name: string;
  document: string;
  email: string;
  phone: string;
  /** 2º telefone (ex.: importação ETB → tel. da propriedade principal). */
  phone2: string;
  /** 3º telefone em diante, um por linha ou separados por vírgula. */
  extraPhones: string;
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
          Telefone principal
          <input
            value={data.phone}
            onChange={(e) => onChange('phone', e.target.value)}
            placeholder="(94) 99999-9999"
          />
        </label>
        <label>
          Telefone 2
          <input
            value={data.phone2}
            onChange={(e) => onChange('phone2', e.target.value)}
            placeholder="2º número da importação / propriedade"
          />
        </label>
        <label className="form-full-width">
          Outros telefones
          <textarea
            value={data.extraPhones}
            onChange={(e) => onChange('extraPhones', e.target.value)}
            rows={2}
            placeholder="Um por linha ou separados por vírgula (3º telefone em diante)"
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
