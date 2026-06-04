'use client';

import type { BatchTags, TenantIntention } from '@/types/client-import';
import { ClientTagsSection } from '@/components/clients/ClientTagsSection';

interface Props {
  tags: BatchTags;
  intentions: TenantIntention[];
  onChange: (tags: BatchTags) => void;
  onApplyToSelected: () => void;
  selectedCount: number;
}

export function ImportBatchTagsPanel({
  tags,
  intentions,
  onChange,
  onApplyToSelected,
  selectedCount,
}: Props) {
  return (
    <div className="card" style={{ marginTop: '1rem' }}>
      <h3 className="form-section-title">Etiquetas do lote</h3>
      <ClientTagsSection
        value={{
          animalType: tags.animalType,
          animalSex: tags.animalSex,
          livestockCategory: tags.livestockCategory,
          intentionIds: tags.intentionIds,
        }}
        intentions={intentions}
        onChange={(value) =>
          onChange({
            ...tags,
            animalType: value.animalType as BatchTags['animalType'],
            animalSex: value.animalSex as BatchTags['animalSex'],
            livestockCategory:
              value.livestockCategory as BatchTags['livestockCategory'],
            intentionIds: value.intentionIds,
          })
        }
      />
      <label style={{ marginTop: '0.75rem' }}>
        Observação de intenção (lote)
        <input
          value={tags.intentionNotes}
          onChange={(e) => onChange({ ...tags, intentionNotes: e.target.value })}
          placeholder="Texto livre aplicado às linhas selecionadas"
        />
      </label>
      <button
        type="button"
        className="ghost"
        style={{ marginTop: '0.75rem' }}
        disabled={selectedCount === 0}
        onClick={onApplyToSelected}
      >
        Aplicar etiquetas às {selectedCount} linha(s) selecionada(s)
      </button>
    </div>
  );
}
