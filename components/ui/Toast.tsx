import { useEffect, type ReactNode } from 'react';
import IconButton from '@/components/ui/IconButton';

interface ToastProps {
  title: string;
  message?: string;
  onClose?: () => void;
  actionLabel?: string;
  onAction?: () => void;
  duration?: number; // ms, 0 = no auto-dismiss
}

export default function Toast({
  title,
  message,
  onClose,
  actionLabel,
  onAction,
  duration = 5000,
}: ToastProps) {
  useEffect(() => {
    if (duration && onClose) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  return (
    <div
      className={`
        fixed top-4 right-4 z-50
        w-[300px]
        bg-[var(--color-bg-surface)]
        border-l-[3px] border-l-[#10B981]
        border border-[var(--color-border)] border-[0.5px]
        rounded-[8px]
        p-[12px_16px]
        text-[13px]
      `}
      role="alert"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <p className="font-medium text-[var(--color-text-primary)]">{title}</p>
          {message && (
            <p className="text-[var(--color-text-secondary)] mt-0.5">{message}</p>
          )}
        </div>
        {onClose && (
          <IconButton
            size="sm"
            onClick={onClose}
            aria-label="Закрыть"
            className="hover:bg-transparent"
            icon={<span aria-hidden="true">✕</span>}
          />
        )}
      </div>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="mt-2 text-[#10B981] font-medium hover:underline text-[12px]"
        >
          {actionLabel} →
        </button>
      )}
    </div>
  );
}
