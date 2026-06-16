'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import {
  ATTENDANCE_ACTION_STATUS_DONE,
  ATTENDANCE_ACTION_STATUS_OPEN,
} from '@docs/shared';
import { AppShell } from '@/components/AppShell';
import { AttendanceBoard } from '@/components/attendance/AttendanceBoard';
import { AttendanceCardDrawer } from '@/components/attendance/AttendanceCardDrawer';
import {
  AttendanceFilters,
  countAttendanceFilters,
} from '@/components/attendance/AttendanceFilters';
import {
  useAttendanceBoard,
  useAttendanceMutations,
} from '@/hooks/use-attendance-board';
import { useAuctionsList } from '@/hooks/use-auctions-list';
import type { AttendanceActionCard } from '@/types/attendance';
import { emptyAttendanceFilters } from '@/types/attendance';

function AttendancePageContent() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filters, setFilters] = useState(emptyAttendanceFilters());
  const [selectedCard, setSelectedCard] = useState<AttendanceActionCard | null>(
    null,
  );

  const { data: auctionsData } = useAuctionsList();
  const auctions = auctionsData?.items ?? [];

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const queryFilters = useMemo(
    () => ({ ...filters, q: debouncedSearch }),
    [filters, debouncedSearch],
  );

  const { data, isLoading, isFetching, error } =
    useAttendanceBoard(queryFilters);
  const mutations = useAttendanceMutations(queryFilters);

  const mutationLoading =
    mutations.createColumn.isPending ||
    mutations.updateColumn.isPending ||
    mutations.deleteColumn.isPending ||
    mutations.createAction.isPending ||
    mutations.updateAction.isPending ||
    mutations.deleteAction.isPending ||
    mutations.createTask.isPending ||
    mutations.updateTask.isPending ||
    mutations.deleteTask.isPending ||
    mutations.createActivity.isPending;

  function handleMoveCard(
    actionId: string,
    _fromColumnId: string,
    toColumnId: string,
  ) {
    mutations.updateAction.mutate({ actionId, columnId: toColumnId });
  }

  function handleCreateColumn(title: string) {
    mutations.createColumn.mutate({ title });
  }

  function handleUpdateColumn(columnId: string, title: string) {
    mutations.updateColumn.mutate({ columnId, title });
  }

  function handleDeleteColumn(columnId: string) {
    if (
      !window.confirm(
        'Excluir esta categoria? Só é possível se não houver ações nela.',
      )
    ) {
      return;
    }
    mutations.deleteColumn.mutate(columnId);
  }

  function handleCreateAction(data: {
    columnId: string;
    clientId: string;
    auctionId?: string;
    title: string;
    description?: string;
  }) {
    mutations.createAction.mutate(data);
  }

  function handleFinalize(actionId: string) {
    mutations.updateAction.mutate(
      { actionId, status: ATTENDANCE_ACTION_STATUS_DONE },
      { onSuccess: () => setSelectedCard(null) },
    );
  }

  function handleReopen(actionId: string) {
    mutations.updateAction.mutate(
      { actionId, status: ATTENDANCE_ACTION_STATUS_OPEN },
      {
        onSuccess: (card) => setSelectedCard(card),
      },
    );
  }

  function handleCreateTask(actionId: string, title: string) {
    mutations.createTask.mutate({ actionId, title });
  }

  function handleToggleTask(taskId: string, actionId: string, done: boolean) {
    mutations.updateTask.mutate({ taskId, actionId, done });
  }

  function handleDeleteTask(taskId: string, actionId: string) {
    mutations.deleteTask.mutate({ taskId, actionId });
  }

  function handleCreateActivity(
    actionId: string,
    type: string,
    content: string,
  ) {
    mutations.createActivity.mutate({ actionId, type, content });
  }

  const activeFilterCount = countAttendanceFilters(filters);

  return (
    <>
      <AttendanceFilters
        values={filters}
        search={search}
        auctions={auctions}
        onSearchChange={setSearch}
        onChange={setFilters}
      />

      {activeFilterCount > 0 && (
        <p className="attendance-filter-summary">
          {activeFilterCount} filtro(s) ativo(s)
        </p>
      )}

      {error && (
        <p className="error-banner">
          {error instanceof Error ? error.message : 'Erro ao carregar o kanban'}
        </p>
      )}

      {isLoading && !data ? (
        <p className="attendance-loading">Carregando kanban...</p>
      ) : data ? (
        <AttendanceBoard
          board={data}
          auctions={auctions}
          loading={isFetching || mutationLoading}
          onMoveCard={handleMoveCard}
          onOpenCard={setSelectedCard}
          onCreateColumn={handleCreateColumn}
          onUpdateColumn={handleUpdateColumn}
          onDeleteColumn={handleDeleteColumn}
          onCreateAction={handleCreateAction}
        />
      ) : null}

      <AttendanceCardDrawer
        card={selectedCard}
        activityTypes={data?.activityTypes ?? []}
        loading={mutationLoading}
        onClose={() => setSelectedCard(null)}
        onFinalize={handleFinalize}
        onReopen={handleReopen}
        onCreateTask={handleCreateTask}
        onToggleTask={handleToggleTask}
        onDeleteTask={handleDeleteTask}
        onCreateActivity={handleCreateActivity}
      />
    </>
  );
}

export default function AttendancePage() {
  return (
    <AppShell title="Atendimento">
      <Suspense fallback={<p className="attendance-loading">Carregando...</p>}>
        <AttendancePageContent />
      </Suspense>
    </AppShell>
  );
}
