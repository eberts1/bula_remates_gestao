'use client';

import { useCallback, useState } from 'react';
import { AttendanceColumn } from '@/components/attendance/AttendanceColumn';
import type {
  AttendanceBoardResponse,
  AttendanceActionCard,
} from '@/types/attendance';
import type { AuctionListItem } from '@/types/auction';

interface Props {
  board: AttendanceBoardResponse;
  auctions: AuctionListItem[];
  loading: boolean;
  onMoveCard: (actionId: string, fromColumnId: string, toColumnId: string) => void;
  onOpenCard: (card: AttendanceActionCard) => void;
  onCreateColumn: (title: string) => void;
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

export function AttendanceBoard({
  board,
  auctions,
  loading,
  onMoveCard,
  onOpenCard,
  onCreateColumn,
  onUpdateColumn,
  onDeleteColumn,
  onCreateAction,
}: Props) {
  const [dragging, setDragging] = useState<{
    cardId: string;
    columnId: string;
  } | null>(null);
  const [dragOverColumnId, setDragOverColumnId] = useState<string | null>(null);
  const [showNewColumn, setShowNewColumn] = useState(false);
  const [newColumnTitle, setNewColumnTitle] = useState('');

  const handleDragStart = useCallback((cardId: string, columnId: string) => {
    setDragging({ cardId, columnId });
  }, []);

  const handleDragEnd = useCallback(() => {
    setDragging(null);
    setDragOverColumnId(null);
  }, []);

  const handleDrop = useCallback(
    (toColumnId: string) => {
      if (!dragging) return;
      if (dragging.columnId !== toColumnId) {
        onMoveCard(dragging.cardId, dragging.columnId, toColumnId);
      }
      setDragging(null);
      setDragOverColumnId(null);
    },
    [dragging, onMoveCard],
  );

  function handleCreateColumn() {
    const trimmed = newColumnTitle.trim();
    if (!trimmed) return;
    onCreateColumn(trimmed);
    setNewColumnTitle('');
    setShowNewColumn(false);
  }

  return (
    <div className="attendance-board-wrapper">
      <div className={`attendance-board${loading ? ' attendance-board--loading' : ''}`}>
        {board.columns.map((column) => (
          <AttendanceColumn
            key={column.id}
            column={column}
            auctions={auctions}
            isDragOver={dragOverColumnId === column.id}
            loading={loading}
            onDragOver={setDragOverColumnId}
            onDragLeave={() => setDragOverColumnId(null)}
            onDrop={handleDrop}
            onOpenCard={onOpenCard}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onUpdateColumn={onUpdateColumn}
            onDeleteColumn={onDeleteColumn}
            onCreateAction={onCreateAction}
          />
        ))}
      </div>

      <div className="attendance-board-add-column">
        {showNewColumn ? (
          <div className="attendance-add-column-form">
            <input
              type="text"
              placeholder="Nome da categoria..."
              value={newColumnTitle}
              onChange={(e) => setNewColumnTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateColumn();
                if (e.key === 'Escape') {
                  setShowNewColumn(false);
                  setNewColumnTitle('');
                }
              }}
              autoFocus
            />
            <button type="button" onClick={handleCreateColumn} disabled={loading}>
              Criar
            </button>
            <button
              type="button"
              className="ghost"
              onClick={() => {
                setShowNewColumn(false);
                setNewColumnTitle('');
              }}
            >
              Cancelar
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="ghost attendance-add-column-btn"
            disabled={loading}
            onClick={() => setShowNewColumn(true)}
          >
            + Nova categoria
          </button>
        )}
      </div>
    </div>
  );
}
