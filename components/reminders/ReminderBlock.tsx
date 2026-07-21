'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Icon } from '@iconify/react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import AddReminderModal from '@/components/reminders/AddReminderModal';
import ReminderHistory from '@/components/reminders/ReminderHistory';
import ReminderItem, {
  toChannelList,
  type ReminderData,
} from '@/components/reminders/ReminderItem';

function normalizeReminder(raw: {
  id: string;
  text: string;
  remindAt: string;
  channels: unknown;
  status: ReminderData['status'];
  firedAt: string | null;
  createdAt: string;
  createdBy: { id: string; name: string };
}): ReminderData {
  return { ...raw, channels: toChannelList(raw.channels) };
}

function BellIcon(): ReactNode {
  return (
    <Icon
      icon="tabler:bell"
      className="h-4 w-4 text-[var(--color-text-tertiary)]"
      aria-hidden="true"
    />
  );
}

interface ReminderBlockProps {
  leadId: string;
  currentUserId: string;
  isAdmin: boolean;
  telegramConnected: boolean;
  /** Закрытый лид: напоминания видны, но не создаются, не правятся и не отменяются. */
  readOnly?: boolean;
}

export default function ReminderBlock({
  leadId,
  currentUserId,
  isAdmin,
  telegramConnected,
  readOnly = false,
}: ReminderBlockProps): ReactNode {
  const [reminders, setReminders] = useState<ReminderData[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingReminder, setEditingReminder] = useState<ReminderData | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load(): Promise<void> {
      try {
        const res = await fetch(`/api/leads/${leadId}/reminders`);
        if (!res.ok) throw new Error('failed');
        const data = (await res.json()) as Parameters<typeof normalizeReminder>[0][];
        if (!cancelled) setReminders(data.map(normalizeReminder));
      } catch {
        if (!cancelled) setLoadError('Не удалось загрузить напоминания');
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [leadId]);

  const activeReminders = useMemo(
    () => (reminders ?? []).filter((r) => r.status === 'PENDING'),
    [reminders],
  );

  const historyReminders = useMemo(
    () => (reminders ?? []).filter((r) => r.status !== 'PENDING'),
    [reminders],
  );

  function canManage(reminder: ReminderData): boolean {
    if (readOnly) return false;
    return isAdmin || reminder.createdBy.id === currentUserId;
  }

  function handleSaved(saved: ReminderData): void {
    setReminders((prev) => {
      if (!prev) return [saved];
      const exists = prev.some((r) => r.id === saved.id);
      const next = exists ? prev.map((r) => (r.id === saved.id ? saved : r)) : [...prev, saved];
      return [...next].sort((a, b) => a.remindAt.localeCompare(b.remindAt));
    });
  }

  async function handleCancel(id: string): Promise<void> {
    setCancellingId(id);

    try {
      const res = await fetch(`/api/leads/${leadId}/reminders/${id}`, { method: 'DELETE' });
      if (!res.ok) return;

      setReminders((prev) =>
        (prev ?? []).map((r) => (r.id === id ? { ...r, status: 'CANCELLED' } : r)),
      );
    } finally {
      setCancellingId(null);
    }
  }

  function openCreateModal(): void {
    setEditingReminder(null);
    setIsModalOpen(true);
  }

  function openEditModal(reminder: ReminderData): void {
    setEditingReminder(reminder);
    setIsModalOpen(true);
  }

  const isLoading = reminders === null && !loadError;

  return (
    <>
      <Card padding="lg">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-[14px] font-medium text-[var(--color-text-primary)]">
            <BellIcon />
            Напоминания
          </h2>

          <div className="flex items-center gap-2">
            {activeReminders.length > 0 && (
              <span
                className="
                  rounded-[20px] bg-[var(--color-bg-surface-2)]
                  px-2 py-0.5 text-[12px] font-medium
                  text-[var(--color-text-secondary)]
                "
              >
                {activeReminders.length}
              </span>
            )}
            {!readOnly && (
              <Button
                variant="ghost"
                size="sm"
                icon={<Icon icon="tabler:plus" className="h-3.5 w-3.5" />}
                onClick={openCreateModal}
              >
                Добавить
              </Button>
            )}
          </div>
        </div>

        {loadError && (
          <p className="text-[13px] text-[#EF4444]">{loadError}</p>
        )}

        {isLoading && (
          <p className="text-[13px] text-[var(--color-text-secondary)]">Загрузка...</p>
        )}

        {!isLoading && !loadError && (
          <>
            {activeReminders.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-6 text-center">
                <p className="text-[13px] text-[var(--color-text-secondary)]">
                  Нет напоминаний по этому лиду
                </p>
                {!readOnly && (
                  <Button variant="primary" size="sm" onClick={openCreateModal}>
                    Добавить напоминание
                  </Button>
                )}
              </div>
            ) : (
              <ul className="flex flex-col divide-y divide-[var(--color-border)]">
                {activeReminders.map((reminder) => (
                  <ReminderItem
                    key={reminder.id}
                    reminder={reminder}
                    canManage={canManage(reminder)}
                    onEdit={openEditModal}
                    onCancel={handleCancel}
                    cancelling={cancellingId === reminder.id}
                  />
                ))}
              </ul>
            )}

            <ReminderHistory reminders={historyReminders} />
          </>
        )}
      </Card>

      {isModalOpen && (
        <AddReminderModal
          leadId={leadId}
          telegramConnected={telegramConnected}
          initial={editingReminder ?? undefined}
          onClose={() => setIsModalOpen(false)}
          onSaved={handleSaved}
        />
      )}
    </>
  );
}
