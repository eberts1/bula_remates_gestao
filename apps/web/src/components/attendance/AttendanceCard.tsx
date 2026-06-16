'use client';

import { ATTENDANCE_ACTION_STATUS_DONE } from '@docs/shared';
import type { AttendanceActionCard } from '@/types/attendance';

const ANIMAL_TYPE_LABELS: Record<string, string> = {
  corte: 'Corte',
  elite: 'Elite',
};

const CATEGORY_LABELS: Record<string, string> = {
  bezerra: 'Bezerra',
  bezerro: 'Bezerro',
  garrote: 'Garrote',
  novilha: 'Novilha',
  vaca: 'Vaca',
  touro: 'Touro',
};

interface Props {
  card: AttendanceActionCard;
  onOpen: (card: AttendanceActionCard) => void;
  onDragStart: (cardId: string, columnId: string) => void;
  onDragEnd: () => void;
}

export function AttendanceCard({
  card,
  onOpen,
  onDragStart,
  onDragEnd,
}: Props) {
  const isDone = card.status === ATTENDANCE_ACTION_STATUS_DONE;
  const progress = card.taskProgress;
  const progressPct =
    progress.total > 0
      ? Math.round((progress.done / progress.total) * 100)
      : 0;

  return (
    <article
      className={`attendance-card${isDone ? ' attendance-card--done' : ''}`}
      draggable
      onDragStart={() => onDragStart(card.id, card.columnId)}
      onDragEnd={onDragEnd}
      onClick={() => onOpen(card)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen(card);
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={`Ação ${card.title} - ${card.client.name}`}
    >
      <header className="attendance-card-header">
        <strong>{card.client.name}</strong>
        {card.client.responsible && (
          <span className="attendance-card-responsible">
            {card.client.responsible.name}
          </span>
        )}
      </header>

      <p className="attendance-card-action-title">{card.title}</p>

      {(card.client.phone || card.client.email) && (
        <p className="attendance-card-contact">
          {card.client.phone ?? card.client.email}
        </p>
      )}

      {card.auction && (
        <p className="attendance-card-auction">
          Leilão: {card.auction.name}
        </p>
      )}

      <div className="attendance-card-tags">
        {card.client.animalType && (
          <span className="badge">
            {ANIMAL_TYPE_LABELS[card.client.animalType] ?? card.client.animalType}
          </span>
        )}
        {card.client.livestockCategory && (
          <span className="badge">
            {CATEGORY_LABELS[card.client.livestockCategory] ??
              card.client.livestockCategory}
          </span>
        )}
        {card.client.intentions.map((i) => (
          <span key={i.id} className="badge badge--muted">
            {i.label}
          </span>
        ))}
      </div>

      {progress.total > 0 && (
        <div className="attendance-card-progress">
          <div className="attendance-card-progress-bar">
            <span style={{ width: `${progressPct}%` }} />
          </div>
          <small>
            Tarefas {progress.done}/{progress.total}
          </small>
        </div>
      )}
    </article>
  );
}
