'use client';

import { type ReactNode } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import type { ManagerOption } from '@/lib/leads/getManagers';

const SOURCE_OPTIONS = [
  { value: '', label: 'Источник' },
  { value: 'tilda', label: 'Tilda' },
  { value: 'yandex', label: 'Директ' },
  { value: 'wordpress', label: 'WP' },
  { value: 'api', label: 'API' },
  { value: 'manual', label: 'Вручную' },
  { value: 'csv', label: 'Импорт' },
];

const STATUS_OPTIONS = [
  { value: '', label: 'Статус' },
  { value: 'open', label: 'Открытые' },
  { value: 'won', label: 'Успешно' },
  { value: 'lost', label: 'Отказ' },
];

const PERIOD_OPTIONS = [
  { value: '', label: 'Период' },
  { value: 'today', label: 'Сегодня' },
  { value: 'week', label: 'За неделю' },
  { value: 'month', label: 'За месяц' },
];

function SearchIcon(): ReactNode {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  );
}

function FilterIcon(): ReactNode {
  return (
    <svg className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--color-text-tertiary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
    </svg>
  );
}

interface FilterSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  id: string;
}

function FilterSelect({ value, onChange, options, id }: FilterSelectProps): ReactNode {
  return (
    <div className="relative min-w-[140px]">
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="
          h-[36px] w-full appearance-none
          rounded-[6px] border border-[var(--color-border)] border-[0.5px]
          bg-[var(--color-bg-surface)] px-3 pr-8
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
      <FilterIcon />
    </div>
  );
}

interface LeadsFiltersProps {
  managers: ManagerOption[];
}

export default function LeadsFilters({ managers }: LeadsFiltersProps): ReactNode {
  const router = useRouter();
  const searchParams = useSearchParams();

  const managerOptions = [
    { value: '', label: 'Менеджер' },
    ...managers.map((m) => ({ value: m.id, label: m.name })),
  ];

  function updateParam(key: string, value: string): void {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.set('page', '1');
    router.push(`/leads?${params.toString()}`);
  }

  function handleReset(): void {
    router.push('/leads');
  }

  const search = searchParams.get('search') ?? '';
  const source = searchParams.get('source') ?? '';
  const status = searchParams.get('status') ?? '';
  const assignedToId = searchParams.get('assignedToId') ?? '';
  const period = searchParams.get('period') ?? '';

  const hasActiveFilters = [search, source, status, assignedToId, period].some(
    (v) => v !== '',
  );

  return (
    <div
      className="
        flex flex-col gap-3 rounded-[12px]
        border border-[var(--color-border)] border-[0.5px]
        bg-[var(--color-bg-surface)] p-3
        lg:flex-row lg:items-center
      "
    >
      <div className="min-w-0 flex-1">
        <Input
          placeholder="Имя, телефон, email..."
          icon={<SearchIcon />}
          value={search}
          onChange={(e) => updateParam('search', e.target.value)}
          aria-label="Поиск лидов"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <FilterSelect
          id="filter-source"
          value={source}
          onChange={(v) => updateParam('source', v)}
          options={SOURCE_OPTIONS}
        />
        <FilterSelect
          id="filter-status"
          value={status}
          onChange={(v) => updateParam('status', v)}
          options={STATUS_OPTIONS}
        />
        <FilterSelect
          id="filter-manager"
          value={assignedToId}
          onChange={(v) => updateParam('assignedToId', v)}
          options={managerOptions}
        />
        <FilterSelect
          id="filter-period"
          value={period}
          onChange={(v) => updateParam('period', v)}
          options={PERIOD_OPTIONS}
        />

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={handleReset}>
            ✕ Сбросить
          </Button>
        )}
      </div>
    </div>
  );
}
