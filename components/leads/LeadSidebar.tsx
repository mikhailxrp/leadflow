'use client';

import { useState } from 'react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';

const INITIAL_STATUS = 'in-progress-2';
const INITIAL_MANAGER = 'alexey';

const STATUS_OPTIONS = [
  { value: 'new', label: 'Новый (Этап 1)' },
  { value: 'in-progress-2', label: 'В работе (Этап 2)' },
  { value: 'warm', label: 'Тёплый клиент (Этап 3)' },
  { value: 'deal', label: 'Сделка (Этап 4)' },
];

const MANAGER_OPTIONS = [
  { value: 'alexey', label: 'Алексей Дмитриев' },
  { value: 'elena', label: 'Елена Волкова' },
  { value: 'ivan', label: 'Иван Козлов' },
];

function FilterSelect({
  id,
  label,
  value,
  onChange,
  options,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
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
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="
          h-[36px] w-full appearance-none rounded-[6px]
          border border-[var(--color-border)] border-[0.5px]
          bg-[var(--color-bg-surface)] px-3
          text-[13px] text-[var(--color-text-primary)]
          outline-none transition-all duration-150
          focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]
        "
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export default function LeadSidebar() {
  const [status, setStatus] = useState(INITIAL_STATUS);
  const [manager, setManager] = useState(INITIAL_MANAGER);

  const hasChanges =
    status !== INITIAL_STATUS || manager !== INITIAL_MANAGER;

  return (
    <Card padding="lg">
      <h2 className="mb-4 text-[14px] font-medium text-[var(--color-text-primary)]">
        Работа с лидом
      </h2>

      <div className="mb-5 flex flex-col gap-4">
        <FilterSelect
          id="lead-status"
          label="Статус"
          value={status}
          onChange={setStatus}
          options={STATUS_OPTIONS}
        />
        <FilterSelect
          id="lead-manager"
          label="Ответственный"
          value={manager}
          onChange={setManager}
          options={MANAGER_OPTIONS}
        />
      </div>

      <Button
        variant="primary"
        size="md"
        className="w-full"
        disabled={!hasChanges}
      >
        Сохранить изменения
      </Button>
    </Card>
  );
}
