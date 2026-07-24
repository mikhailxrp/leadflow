'use client';

import {
  useLayoutEffect,
  useState,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from 'react';
import { useRouter } from 'next/navigation';
import Toast from '@/components/ui/Toast';
import { useNotificationStore, type NotificationItem } from '@/store/notificationStore';

interface NotificationDropdownProps {
  onClose: () => void;
  /** Кнопка-колокольчик — к её нижнему правому углу привязывается панель. */
  anchorRef: RefObject<HTMLElement | null>;
}

/** Зазор от края экрана (px) на мобильных, чтобы панель не упиралась в border. */
const VIEWPORT_MARGIN = 12;
/** Отступ панели вниз от колокольчика (px). */
const ANCHOR_GAP = 8;
const DESKTOP_WIDTH = 320;
const MOBILE_MAX_WIDTH = 360;
const MOBILE_BREAKPOINT = 640;

/**
 * Панель уведомлений позиционируется как `fixed` по измеренному положению
 * колокольчика, а не через `absolute right-0`. Иначе на узких экранах (320–425px)
 * панель шириной 320px, выровненная по правому краю колокольчика, вылезает за
 * левый край вьюпорта и обрезается. Привязка к измеренному rect делает её
 * устойчивой и к плашке impersonation, которая сдвигает шапку вниз.
 */
function computePanelStyle(anchor: HTMLElement | null): CSSProperties {
  if (!anchor || typeof window === 'undefined') {
    return { position: 'fixed', top: -9999, left: -9999, visibility: 'hidden' };
  }

  const rect = anchor.getBoundingClientRect();
  const vw = window.innerWidth;
  const isMobile = vw < MOBILE_BREAKPOINT;

  const width = isMobile
    ? Math.min(MOBILE_MAX_WIDTH, vw - VIEWPORT_MARGIN * 2)
    : DESKTOP_WIDTH;

  // Мобильный: прижимаем правый край к правому краю вьюпорта.
  // Десктоп: правый край панели совпадает с правым краем колокольчика (как right-0).
  const rawLeft = isMobile ? vw - VIEWPORT_MARGIN - width : rect.right - width;
  const left = Math.max(
    VIEWPORT_MARGIN,
    Math.min(rawLeft, vw - VIEWPORT_MARGIN - width),
  );

  return { position: 'fixed', top: rect.bottom + ANCHOR_GAP, left, width };
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

export default function NotificationDropdown({
  onClose,
  anchorRef,
}: NotificationDropdownProps): ReactNode {
  const items = useNotificationStore((state) => state.items);
  const unreadCount = useNotificationStore((state) => state.unreadCount);
  const markAllRead = useNotificationStore((state) => state.markAllRead);
  const markItemRead = useNotificationStore((state) => state.markItemRead);
  const router = useRouter();
  const [markingAll, setMarkingAll] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [panelStyle, setPanelStyle] = useState<CSSProperties>(() =>
    computePanelStyle(null),
  );

  useLayoutEffect(() => {
    function reposition(): void {
      setPanelStyle(computePanelStyle(anchorRef.current));
    }
    reposition();
    window.addEventListener('resize', reposition);
    return () => window.removeEventListener('resize', reposition);
  }, [anchorRef]);

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

  function handleItemClick(item: NotificationItem): void {
    onClose();
    markItemRead(item.id);
    fetch(`/api/notifications/${item.id}/read`, { method: 'POST' }).catch(console.error);
    if (item.leadId) router.push(`/leads/${item.leadId}`);
  }

  return (
    <div
      role="menu"
      style={panelStyle}
      className="z-50 rounded-[8px] border border-[0.5px] border-[var(--color-border)] bg-[var(--color-bg-surface)] shadow-lg"
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
              onClick={() => handleItemClick(item)}
              className="flex w-full flex-col gap-0.5 border-b border-[0.5px] border-[var(--color-border)] px-4 py-3 text-left last:border-b-0 hover:bg-[var(--color-bg-surface-2)]"
            >
              <span className="flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#10B981]"
                />
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
