'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ATTENDANCE_ACTION_STATUS_DONE,
  ATTENDANCE_ACTION_STATUS_OPEN,
} from '@docs/shared';
import {
  useAttendanceActionDetail,
} from '@/hooks/use-attendance-board';
import type {
  AttendanceActionCard,
  AttendanceActivityType,
} from '@/types/attendance';

interface Props {
  card: AttendanceActionCard | null;
  activityTypes: AttendanceActivityType[];
  loading: boolean;
  onClose: () => void;
  onFinalize: (actionId: string) => void;
  onReopen: (actionId: string) => void;
  onCreateTask: (actionId: string, title: string) => void;
  onToggleTask: (taskId: string, actionId: string, done: boolean) => void;
  onDeleteTask: (taskId: string, actionId: string) => void;
  onCreateActivity: (actionId: string, type: string, content: string) => void;
}

const ACTIVITY_ICONS: Record<string, string> = {
  note: '📝',
  call: '📞',
  whatsapp: '💬',
  email: '📧',
  visit: '🏠',
};

export function AttendanceCardDrawer({
  card,
  activityTypes,
  loading,
  onClose,
  onFinalize,
  onReopen,
  onCreateTask,
  onToggleTask,
  onDeleteTask,
  onCreateActivity,
}: Props) {
  const { data: detail } = useAttendanceActionDetail(card?.id ?? null);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [activityType, setActivityType] = useState('note');
  const [activityContent, setActivityContent] = useState('');

  useEffect(() => {
    setNewTaskTitle('');
    setActivityType('note');
    setActivityContent('');
  }, [card?.id]);

  useEffect(() => {
    if (!card) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }

    document.addEventListener('keydown', onKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
    };
  }, [card, onClose]);

  if (!card) return null;

  const isFinalized = card.status === ATTENDANCE_ACTION_STATUS_DONE;
  const tasks = detail?.tasks ?? [];
  const activities = detail?.activities ?? [];

  function handleAddTask(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = newTaskTitle.trim();
    if (!trimmed) return;
    onCreateTask(card!.id, trimmed);
    setNewTaskTitle('');
  }

  function handleAddActivity(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = activityContent.trim();
    if (!trimmed) return;
    onCreateActivity(card!.id, activityType, trimmed);
    setActivityContent('');
  }

  return (
    <div className="client-drawer-root" role="presentation">
      <button
        type="button"
        className="client-drawer-backdrop"
        aria-label="Fechar"
        onClick={onClose}
      />
      <aside
        className="client-drawer"
        aria-label="Detalhe da ação"
        role="dialog"
        aria-modal="true"
      >
        <header className="client-drawer-header">
          <div>
            <h2>{card.client.name}</h2>
            <p className="attendance-drawer-subtitle">{card.title}</p>
            {card.client.responsible && (
              <p className="attendance-drawer-subtitle">
                Responsável: {card.client.responsible.name}
              </p>
            )}
          </div>
          <button
            type="button"
            className="client-drawer-close ghost"
            onClick={onClose}
            aria-label="Fechar painel"
          >
            ✕
          </button>
        </header>

        <div className="client-drawer-body">
          <div className="client-drawer-inner">
            <section className="card attendance-drawer-section">
              <h3>Contato</h3>
              <dl className="attendance-drawer-dl">
                {card.client.phone && (
                  <>
                    <dt>Telefone</dt>
                    <dd>{card.client.phone}</dd>
                  </>
                )}
                {card.client.email && (
                  <>
                    <dt>E-mail</dt>
                    <dd>{card.client.email}</dd>
                  </>
                )}
              </dl>
              <Link
                href={`/clients/${card.client.id}`}
                className="attendance-drawer-link"
              >
                Ver ficha completa →
              </Link>
            </section>

            {card.auction && (
              <section className="card attendance-drawer-section">
                <h3>Leilão vinculado</h3>
                <p>
                  <strong>{card.auction.name}</strong>
                </p>
                {card.auction.scheduledAt && (
                  <p className="attendance-drawer-subtitle">
                    {new Date(card.auction.scheduledAt).toLocaleDateString(
                      'pt-BR',
                    )}
                  </p>
                )}
                <Link
                  href={`/auctions/${card.auction.id}`}
                  className="attendance-drawer-link"
                >
                  Ver leilão →
                </Link>
              </section>
            )}

            {card.description && (
              <section className="card attendance-drawer-section">
                <h3>Descrição</h3>
                <p>{card.description}</p>
              </section>
            )}

            <section className="card attendance-drawer-section">
              <h3>Tarefas</h3>
              {tasks.length === 0 ? (
                <p className="attendance-drawer-subtitle">Nenhuma tarefa</p>
              ) : (
                <ul className="attendance-task-list">
                  {tasks.map((task) => (
                    <li key={task.id} className="attendance-task-item">
                      <label>
                        <input
                          type="checkbox"
                          checked={task.done}
                          disabled={loading || isFinalized}
                          onChange={() =>
                            onToggleTask(task.id, card.id, !task.done)
                          }
                        />
                        <span
                          className={
                            task.done ? 'attendance-task-done' : undefined
                          }
                        >
                          {task.title}
                        </span>
                      </label>
                      {!isFinalized && (
                        <button
                          type="button"
                          className="ghost attendance-task-delete"
                          disabled={loading}
                          onClick={() => onDeleteTask(task.id, card.id)}
                          aria-label="Remover tarefa"
                        >
                          ✕
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}

              {!isFinalized && (
                <form
                  className="attendance-task-add"
                  onSubmit={handleAddTask}
                >
                  <input
                    type="text"
                    placeholder="Nova tarefa..."
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    disabled={loading}
                  />
                  <button type="submit" disabled={loading || !newTaskTitle.trim()}>
                    Adicionar
                  </button>
                </form>
              )}
            </section>

            <section className="card attendance-drawer-section">
              <h3>Atividades</h3>

              {!isFinalized && (
                <form
                  className="attendance-activity-add"
                  onSubmit={handleAddActivity}
                >
                  <div className="attendance-activity-type-row">
                    {activityTypes.map((t) => (
                      <button
                        key={t.type}
                        type="button"
                        className={`ghost attendance-activity-type-btn${
                          activityType === t.type
                            ? ' attendance-activity-type-btn--active'
                            : ''
                        }`}
                        onClick={() => setActivityType(t.type)}
                      >
                        {ACTIVITY_ICONS[t.type] ?? '•'} {t.label}
                      </button>
                    ))}
                  </div>
                  <textarea
                    placeholder="Registrar atividade..."
                    value={activityContent}
                    onChange={(e) => setActivityContent(e.target.value)}
                    rows={3}
                    disabled={loading}
                  />
                  <button
                    type="submit"
                    disabled={loading || !activityContent.trim()}
                  >
                    Registrar
                  </button>
                </form>
              )}

              {activities.length === 0 ? (
                <p className="attendance-drawer-subtitle">
                  Nenhuma atividade registrada
                </p>
              ) : (
                <ul className="attendance-activity-timeline">
                  {activities.map((activity) => (
                    <li key={activity.id} className="attendance-activity-item">
                      <div className="attendance-activity-item-header">
                        <span>
                          {ACTIVITY_ICONS[activity.type] ?? '•'}{' '}
                          {activityTypes.find((t) => t.type === activity.type)
                            ?.label ?? activity.type}
                        </span>
                        <time>
                          {new Date(activity.createdAt).toLocaleString('pt-BR')}
                        </time>
                      </div>
                      <p>{activity.content}</p>
                      {activity.author && (
                        <small className="attendance-activity-author">
                          {activity.author.name}
                        </small>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <div className="attendance-drawer-actions">
              {isFinalized ? (
                <button
                  type="button"
                  className="ghost"
                  disabled={loading}
                  onClick={() => onReopen(card.id)}
                >
                  Reabrir atendimento
                </button>
              ) : (
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => onFinalize(card.id)}
                >
                  Finalizar atendimento
                </button>
              )}
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
