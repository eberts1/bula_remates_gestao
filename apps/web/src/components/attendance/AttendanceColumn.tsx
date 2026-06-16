'use client';

import { useState } from 'react';
import type { DragEvent } from 'react';
import { AttendanceCard } from '@/components/attendance/AttendanceCard';
import { AttendanceAddActionForm } from '@/components/attendance/AttendanceAddActionForm';
import type {
  AttendanceActionCard,
  AttendanceBoardColumn,
} from '@/types/attendance';
import type { AuctionListItem } from '@/types/auction';

interface Props {
  column: AttendanceBoardColumn;
  auctions: AuctionListItem[];
  isDragOver: boolean;
  loading: boolean;
  onDragOver: (columnId: string) => void;
  onDragLeave: () => void;
  onDrop: (columnId: string) => void;
  onOpenCard: (card: AttendanceActionCard) => void;
  onDragStart: (cardId: string, columnId: string) => void;
  onDragEnd: () => void;
  onUpdateColumn: (columnId: string, title: string) => void;
  onDeleteColumn: (columnId: string) => void;
  onCreateAction: (data: {
    columnId: string;
    clientId: string;
    auctionId?: string;
    title: string;
    description?: string;
  }) => void;
}

export function AttendanceColumn({
  column,
  auctions,
  isDragOver,
  loading,
  onDragOver,
  onDragLeave,
  onDrop,
  onOpenCard,
  onDragStart,
  onDragEnd,
  onUpdateColumn,
  onDeleteColumn,
  onCreateAction,
}: Props) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(column.title);

  function handleDragOver(e: DragEvent) {
    e.preventDefault();
    onDragOver(column.id);
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    onDrop(column.id);
  }

  function commitTitleEdit() {
    const trimmed = titleDraft.trim();
    if (trimmed && trimmed !== column.title) {
      onUpdateColumn(column.id, trimmed);
    } else {
      setTitleDraft(column.title);
    }
    setEditingTitle(false);
  }

  return (
    <section
      className={`attendance-column${isDragOver ? ' attendance-column--drag-over' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={onDragLeave}
      onDrop={handleDrop}
    >
      <header className="attendance-column-header">
        {editingTitle ? (
          <input
            className="attendance-column-title-input"
            value={titleDraft}
            onChange={(e) => setTitleDraft(e.target.value)}
            onBlur={commitTitleEdit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitTitleEdit();
              if (e.key === 'Escape') {
                setTitleDraft(column.title);
                setEditingTitle(false);
              }
            }}
            autoFocus
          />
        ) : (
          <h3 onDoubleClick={() => setEditingTitle(true)}>{column.title}</h3>
        )}
        <span className="attendance-column-count">{column.total}</span>
        <div className="attendance-column-menu">
          <button
            type="button"
            className="ghost attendance-column-menu-btn"
            title="Renomear coluna"
            onClick={() => setEditingTitle(true)}
          >
            ✎
          </button>
          <button
            type="button"
            className="ghost attendance-column-menu-btn"
            title="Excluir coluna"
            disabled={loading}
            onClick={() => onDeleteColumn(column.id)}
          >
            ✕
          </button>
        </div>
      </header>

      <div className="attendance-column-body">
        {column.cards.length === 0 ? (
          <p className="attendance-column-empty">Nenhuma ação</p>
        ) : (
          column.cards.map((card) => (
            <AttendanceCard
              key={card.id}
              card={card}
              onOpen={onOpenCard}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
            />
          ))
        )}

        {column.hasMore && (
          <p className="attendance-column-more">
            +{column.total - column.cards.length} ocultos (refine os filtros)
          </p>
        )}

        {showAddForm ? (
          <AttendanceAddActionForm
            columnId={column.id}
            auctions={auctions}
            loading={loading}
            onCancel={() => setShowAddForm(false)}
            onSubmit={(data) => {
              onCreateAction(data);
              setShowAddForm(false);
            }}
          />
        ) : (
          <button
            type="button"
            className="ghost attendance-column-add-btn"
            disabled={loading}
            onClick={() => setShowAddForm(true)}
          >
            + Adicionar
          </button>
        )}
      </div>
    </section>
  );
}
