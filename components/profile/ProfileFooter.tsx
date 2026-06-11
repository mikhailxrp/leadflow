'use client';

import Button from '@/components/ui/Button';

interface ProfileFooterProps {
  isDirty: boolean;
  onCancel: () => void;
  onSave: () => void;
}

export default function ProfileFooter({ isDirty, onCancel, onSave }: ProfileFooterProps) {
  if (!isDirty) return null;

  return (
    <footer
      className="
        sticky bottom-0 z-20
        flex items-center justify-between
        border-t-[0.5px] border-[var(--color-border)]
        bg-[var(--color-bg-surface)] px-6 py-3
      "
    >
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 shrink-0 rounded-full bg-[#10B981]" aria-hidden="true" />
        <span className="text-[13px] text-[var(--color-text-secondary)]">
          Изменения не сохранены
        </span>
      </div>

      <div className="flex items-center gap-3">
        <Button variant="ghost" size="md" type="button" onClick={onCancel}>
          Отмена
        </Button>
        <Button variant="primary" size="md" type="button" onClick={onSave}>
          Сохранить
        </Button>
      </div>
    </footer>
  );
}
