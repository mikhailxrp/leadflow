'use client';

import { useState, type ReactNode } from 'react';
import { Icon } from '@iconify/react';
import { ChannelBadge, type ReminderData } from '@/components/reminders/ReminderItem';

function formatHistoryDate(reminder: ReminderData): string {
  const iso = reminder.status === 'FIRED' ? reminder.firedAt : reminder.createdAt;
  if (!iso) return '';

  return new Date(iso).toLocaleString('ru-RU', {
    day: '2-digit',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function statusLabel(reminder: ReminderData): string {
  return reminder.status === 'FIRED' ? 'сработало' : 'отменено';
}

interface ReminderHistoryProps {
  reminders: ReminderData[];
}

export default function ReminderHistory({ reminders }: ReminderHistoryProps): ReactNode {
  const [isExpanded, setIsExpanded] = useState(false);

  if (reminders.length === 0) return null;

  return (
    <div className="mt-3 border-t border-[var(--color-border)] border-[0.5px] pt-3">
      <button
        type="button"
        onClick={() => setIsExpanded((prev) => !prev)}
        className="
          flex w-full items-center justify-between gap-2
          rounded-[6px] px-2 py-1.5 text-left
          text-[12px] font-medium text-[var(--color-text-secondary)]
          transition-colors duration-150
          hover:text-[var(--color-text-primary)]
        "
        aria-expanded={isExpanded}
      >
        <span>История напоминаний ({reminders.length})</span>
        <Icon
          icon={isExpanded ? 'tabler:chevron-up' : 'tabler:chevron-down'}
          className="h-4 w-4 shrink-0"
          aria-hidden="true"
        />
      </button>

      {isExpanded && (
        <ul className="mt-1 flex flex-col divide-y divide-[var(--color-border)]">
          {reminders.map((reminder) => (
            <li key={reminder.id} className="py-2.5 first:pt-1">
              <div className="mb-1 flex items-center gap-2 text-[12px] text-[var(--color-text-tertiary)]">
                <span>{formatHistoryDate(reminder)}</span>
                <span aria-hidden="true">·</span>
                <span>{statusLabel(reminder)}</span>
              </div>
              <p className="mb-1.5 text-[13px] text-[var(--color-text-secondary)] line-through opacity-70">
                {reminder.text}
              </p>
              <div className="flex flex-wrap items-center gap-1.5">
                {reminder.channels.map((channel) => (
                  <ChannelBadge key={channel} channel={channel} />
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
