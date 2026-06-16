'use client';

import {
  ANIMAL_SEXES,
  ANIMAL_TYPES,
  AUCTION_STATUSES,
  AUCTION_STATUS_LABELS,
  LIVESTOCK_CATEGORIES,
} from '@docs/shared';
import {
  ANIMAL_SEX_LABELS,
  ANIMAL_TYPE_LABELS,
  CATEGORY_LABELS,
} from '@/components/clients/ClientTagsSection';
import type { TenantIntention } from '@/types/client-import';
import type { AuctionFormValue } from '@/types/auction';

interface Props {
  value: AuctionFormValue;
  intentions: TenantIntention[];
  onChange: (value: AuctionFormValue) => void;
}

export function AuctionForm({ value, intentions, onChange }: Props) {
  function set<K extends keyof AuctionFormValue>(
    field: K,
    fieldValue: AuctionFormValue[K],
  ) {
    onChange({ ...value, [field]: fieldValue });
  }

  function toggleCategory(category: string) {
    const categories = new Set(value.livestockCategories);
    if (categories.has(category)) categories.delete(category);
    else categories.add(category);
    set('livestockCategories', [...categories]);
  }

  return (
    <form className="auction-form" onSubmit={(event) => event.preventDefault()}>
      <section className="auction-form-block">
        <header className="auction-form-block-header">
          <h3>Dados do leilao</h3>
          <p>Informacoes basicas exibidas na agenda.</p>
        </header>

        <label>
          Nome do leilao *
          <input
            type="text"
            value={value.name}
            onChange={(event) => set('name', event.target.value)}
            required
            maxLength={200}
          />
        </label>

        <div className="auction-form-grid">
          <label>
            Data
            <input
              type="datetime-local"
              value={value.scheduledAt}
              onChange={(event) => set('scheduledAt', event.target.value)}
            />
          </label>

          <label>
            Status
            <select
              value={value.status}
              onChange={(event) => set('status', event.target.value)}
            >
              {AUCTION_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {AUCTION_STATUS_LABELS[status]}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label>
          Local
          <input
            type="text"
            value={value.location}
            onChange={(event) => set('location', event.target.value)}
            maxLength={300}
          />
        </label>

        <label>
          Ofertas disponiveis
          <textarea
            value={value.offersNotes}
            onChange={(event) => set('offersNotes', event.target.value)}
            rows={4}
            placeholder="Descreva os lotes e ofertas deste leilao..."
          />
        </label>

        <label className="auction-bula-toggle">
          <input
            type="checkbox"
            checked={value.isBulaRemates}
            onChange={(event) => set('isBulaRemates', event.target.checked)}
          />
          <span>
            <strong>Leilao Bula Remates</strong>
            <small>Destaca este leilao como evento da nossa leiloeira.</small>
          </span>
        </label>
      </section>

      <section className="auction-form-block">
        <header className="auction-form-block-header">
          <h3>Atributos para match</h3>
          <p>
            Clientes com tags compativeis serao sugeridos automaticamente.
          </p>
        </header>

        <div className="auction-form-grid auction-form-grid--three">
          <label>
            Tipo animal
            <select
              value={value.animalType}
              onChange={(event) => set('animalType', event.target.value)}
            >
              <option value="">Qualquer</option>
              {ANIMAL_TYPES.map((type) => (
                <option key={type} value={type}>
                  {ANIMAL_TYPE_LABELS[type]}
                </option>
              ))}
            </select>
          </label>

          <label>
            Sexo
            <select
              value={value.animalSex}
              onChange={(event) => set('animalSex', event.target.value)}
            >
              <option value="">Qualquer</option>
              {ANIMAL_SEXES.map((sex) => (
                <option key={sex} value={sex}>
                  {ANIMAL_SEX_LABELS[sex]}
                </option>
              ))}
            </select>
          </label>

          <label>
            Intencao alvo
            <select
              value={value.targetIntentionCode}
              onChange={(event) => set('targetIntentionCode', event.target.value)}
            >
              {intentions.map((intention) => (
                <option key={intention.id} value={intention.code}>
                  {intention.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="auction-categories">
          <span>Categorias</span>
          <div className="auction-categories-list">
            {LIVESTOCK_CATEGORIES.map((category) => {
              const selected = value.livestockCategories.includes(category);
              return (
                <label
                  key={category}
                  className={`auction-category-chip${selected ? ' is-selected' : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => toggleCategory(category)}
                  />
                  {CATEGORY_LABELS[category]}
                </label>
              );
            })}
          </div>
        </div>
      </section>

      <section className="auction-form-block auction-form-block--footer">
        <label className="auction-active-toggle">
          <input
            type="checkbox"
            checked={value.active}
            onChange={(event) => set('active', event.target.checked)}
          />
          <span>
            <strong>Leilao ativo</strong>
            <small>Leiloes inativos ficam ocultos nas buscas automaticas.</small>
          </span>
        </label>
      </section>
    </form>
  );
}
