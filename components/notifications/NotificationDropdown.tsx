'use client';

import { useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import Toast from '@/components/ui/Toast';
import { useNotificationStore } from '@/store/notificationStore';

interface NotificationDropdownProps {
  onClose: () => void;
}

function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60_000);

  if (minutes < 1) return 'только что';
  if (minutes < 60) return `${minutes} мин назад`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ч назад`;

  const days = Math.floor(hours / 24);
  return `${days} дн назад`;
}

export default function NotificationDropdown({ onClose }: NotificationDropdownProps): ReactNode {
  const items = useNotificationStore((state) => state.items);
  const unreadCount = useNotificationStore((state) => state.unreadCount);
  const markAllRead = useNotificationStore((state) => state.markAllRead);
  const router = useRouter();
  const [markingAll, setMarkingAll] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleMarkAllRead(): Promise<void> {
    setMarkingAll(true);
    try {
      const res = await fetch('/api/notifications/read', { method: 'POST' });
      if (!res.ok) {
        setError('Не удалось отметить уведомления прочитанными');
        return;
      }
      markAllRead();
    } catch {
      setError('Не удалось отметить уведомления прочитанными');
    } finally {
      setMarkingAll(false);
    }
  }

  function handleItemClick(leadId: string | null): void {
    onClose();
    if (leadId) router.push(`/leads/${leadId}`);
  }

  return (
    <div
      role="menu"
      className="absolute right-0 top-full z-50 mt-2 w-[320px] rounded-[8px] border border-[0.5px] border-[var(--color-border)] bg-[var(--color-bg-surface)] shadow-lg"
    >
      <div className="flex items-center justify-between border-b border-[0.5px] border-[var(--color-border)] px-4 py-3">
        <span className="text-[13px] font-medium text-[var(--color-text-primary)]">Уведомления</span>
        {unreadCount > 0 && (
          <button
            type="button"
            onClick={handleMarkAllRead}
            disabled={markingAll}
            className="text-[12px] font-medium text-[#10B981] hover:underline disabled:opacity-50"
          >
            Прочитать всё
          </button>
        )}
      </div>

      <div className="max-h-80 overflow-y-auto">
        {items.length === 0 ? (
          <p className="px-4 py-6 text-center text-[13px] text-[var(--color-text-secondary)]">
            Нет уведомлений
          </p>
        ) : (
          items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => handleItemClick(item.leadId)}
              className="flex w-full flex-col gap-0.5 border-b border-[0.5px] border-[var(--color-border)] px-4 py-3 text-left last:border-b-0 hover:bg-[var(--color-bg-surface-2)]"
            >
              <span className="flex items-center gap-2">
                {!item.readAt && (
                  <span
                    aria-hidden="true"
                    className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#10B981]"
                  />
                )}
                <span className="text-[13px] font-medium text-[var(--color-text-primary)]">
                  {item.title}
                </span>
              </span>
              {item.body && (
                <span className="text-[12px] text-[var(--color-text-secondary)]">{item.body}</span>
              )}
              <span className="text-[11px] text-[var(--color-text-tertiary)]">
                {formatRelativeTime(item.createdAt)}
              </span>
            </button>
          ))
        )}
      </div>

      {error && <Toast title={error} onClose={() => setError(null)} />}
    </div>
  );
}
