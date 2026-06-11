'use client';

import { Icon } from '@iconify/react';
import Button from '@/components/ui/Button';

export default function ProfileSidebar() {
  return (
    <aside className="w-[280px] shrink-0 rounded-lg border-[0.5px] border-[var(--color-border)] bg-[var(--color-bg-surface)] p-6">
      <div
        className="
          mx-auto flex h-24 w-24 items-center justify-center rounded-full
          border-[0.5px] border-[var(--color-border)]
          bg-[var(--color-bg-surface-2)]
          text-[28px] font-medium text-[var(--color-text-primary)]
        "
        aria-hidden="true"
      >
        АД
      </div>

      <Button
        variant="secondary"
        size="sm"
        type="button"
        className="mt-4 w-full"
        icon={<Icon icon="tabler:upload" className="h-4 w-4" />}
      >
        Загрузить фото
      </Button>

      <p className="mt-1 text-center text-[11px] text-[var(--color-text-tertiary)]">
        JPG, PNG до 2MB
      </p>

      <p className="mt-4 text-center text-[15px] font-medium text-[var(--color-text-primary)]">
        Алексей Дмитриев
      </p>

      <div className="mt-1 flex justify-center">
        <span className="rounded-[20px] bg-[#D1FAE5] px-3 py-1 text-[12px] font-medium text-[#065F46]">
          Администратор
        </span>
      </div>

      <div className="mt-4 border-t-[0.5px] border-[var(--color-border)]" />

      <div className="mt-4 flex flex-col gap-2 text-[12px] text-[var(--color-text-secondary)]">
        <div className="flex items-center gap-2">
          <Icon icon="tabler:calendar" className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>В системе с 12.05.2023</span>
        </div>
        <div className="flex items-center gap-2">
          <Icon icon="tabler:clock" className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>Последний вход: сегодня 09:41</span>
        </div>
      </div>
    </aside>
  );
}
