'use client';

import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';

function DisabledSelect({ label, id }: { label: string; id: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={id}
        className="text-[12px] font-normal text-[var(--color-text-secondary)]"
      >
        {label}
      </label>
      <select
        id={id}
        disabled
        className="
          h-[36px] w-full appearance-none rounded-[6px]
          border border-[var(--color-border)] border-[0.5px]
          bg-[var(--color-bg-surface-2)] px-3
          text-[13px] text-[var(--color-text-tertiary)]
          outline-none
        "
      >
        <option value="">—</option>
      </select>
    </div>
  );
}

export default function LeadSidebar() {
  return (
    <Card padding="lg">
      <h2 className="mb-4 text-[14px] font-medium text-[var(--color-text-primary)]">
        Работа с лидом
      </h2>

      <div className="mb-5 flex flex-col gap-4">
        <DisabledSelect id="lead-status" label="Статус" />
        <DisabledSelect id="lead-manager" label="Ответственный" />
      </div>

      <Button
        variant="primary"
        size="md"
        className="w-full"
        disabled
      >
        Сохранить изменения
      </Button>
    </Card>
  );
}
