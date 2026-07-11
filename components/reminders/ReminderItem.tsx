'use client';

import { type ReactNode } from 'react';
import { Icon } from '@iconify/react';
import Button from '@/components/ui/Button';

export type ReminderChannelName = 'telegram' | 'email';
export type ReminderStatusValue = 'PENDING' | 'FIRED' | 'CANCELLED';

export interface ReminderData {
  id: string;
  text: string;
  remindAt: string;
  channels: ReminderChannelName[];
  status: ReminderStatusValue;
  firedAt: string | null;
  createdAt: string;
  createdBy: { id: string; name: string };
}

const CHANNEL_LABELS: Record<ReminderChannelName, string> = {
  telegram: 'Telegram',
  email: 'Email',
};

const CHANNEL_ICONS: Record<ReminderChannelName, string> = {
  telegram: 'tabler:brand-telegram',
  email: 'tabler:mail',
};

export function toChannelList(value: unknown): ReminderChannelName[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is ReminderChannelName => item === 'telegram' || item === 'email',
  );
}

function formatRemindAt(iso: string): string {
  return new Date(iso).toLocaleString('ru-RU', {
    day: '2-digit',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  });
}

interface ChannelBadgeProps {
  channel: ReminderChannelName;
}

export function ChannelBadge({ channel }: ChannelBadgeProps): ReactNode {
  return (
    <span
      className="
        inline-flex items-center gap-1
        rounded-[6px] bg-[var(--color-bg-surface-2)]
        px-2 py-0.5 text-[11px] font-medium
        text-[var(--color-text-secondary)]
      "
    >
      <Icon icon={CHANNEL_ICONS[channel]} className="h-3 w-3" aria-hidden="true" />
      {CHANNEL_LABELS[channel]}
    </span>
  );
}

interface ReminderItemProps {
  reminder: ReminderData;
  canManage: boolean;
  onEdit: (reminder: ReminderData) => void;
  onCancel: (id: string) => void;
  cancelling?: boolean;
}

export default function ReminderItem({
  reminder,
  canManage,
  onEdit,
  onCancel,
  cancelling = false,
}: ReminderItemProps): ReactNode {
  return (
    <li className="border-b-[0.5px] border-[var(--color-border)] py-3 last:border-b-0 last:pb-0 first:pt-0">
      <div className="mb-1 text-[12px] text-[var(--color-text-tertiary)]">
        {formatRemindAt(reminder.remindAt)}
      </div>
      <p className="mb-2 text-[13px] text-[var(--color-text-primary)]">{reminder.text}</p>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          {reminder.channels.map((channel) => (
            <ChannelBadge key={channel} channel={channel} />
          ))}
        </div>
        {canManage && (
          <div className="flex shrink-0 items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => onEdit(reminder)}>
              Изменить
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={cancelling}
              onClick={() => onCancel(reminder.id)}
            >
              {cancelling ? 'Отмена...' : 'Отменить'}
            </Button>
          </div>
        )}
      </div>
    </li>
  );
}
