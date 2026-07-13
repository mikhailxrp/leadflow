'use client';

import { useMemo, useState } from 'react';
import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import type {
  ImportColumnMapping,
  ImportPreviewDedupResult,
  MappingTarget,
  ParsedRow,
} from '@/types/import';

const FIXED_TARGET_OPTIONS: { value: string; label: string }[] = [
  { value: 'skip', label: 'Не импортировать' },
  { value: 'name', label: 'Имя' },
  { value: 'phone', label: 'Телефон' },
  { value: 'email', label: 'Email' },
  { value: 'comment', label: 'Комментарий' },
];

function targetOptionsForColumn(column: string): { value: string; label: string }[] {
  return [...FIXED_TARGET_OPTIONS, { value: `customField:${column}`, label: 'Дополнительное поле' }];
}

interface ColumnMappingStepProps {
  columns: string[];
  rows: ParsedRow[];
  initialMapping: ImportColumnMapping;
  onBack: () => void;
  onMapped: (result: ImportPreviewDedupResult, mapping: ImportColumnMapping) => void;
}

export default function ColumnMappingStep({
  columns,
  rows,
  initialMapping,
  onBack,
  onMapped,
}: ColumnMappingStepProps) {
  const [mapping, setMapping] = useState<ImportColumnMapping>(initialMapping);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const examples = useMemo(() => {
    const result: Record<string, string> = {};
    for (const column of columns) {
      const row = rows.find((r) => {
        const value = r[column];
        return value !== null && value !== undefined && String(value).trim() !== '';
      });
      result[column] = row ? String(row[column]) : '—';
    }
    return result;
  }, [columns, rows]);

  function handleTargetChange(column: string, target: string): void {
    setMapping((prev) => ({ ...prev, [column]: target as MappingTarget }));
  }

  async function handleSubmit(): Promise<void> {
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/import/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mapping, rows }),
      });
      const data: unknown = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError('Не удалось построить превью. Проверьте маппинг и попробуйте ещё раз.');
        return;
      }

      onMapped(data as ImportPreviewDedupResult, mapping);
    } catch {
      setError('Не удалось построить превью. Проверьте маппинг и попробуйте ещё раз.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div>
      <p className="mb-4 text-[13px] text-[var(--color-text-secondary)]">
        Сопоставьте колонки файла с полями Лид-Канал. Колонки без сопоставления не будут
        импортированы.
      </p>

      <div className="overflow-x-auto rounded-[8px] border-[0.5px] border-[var(--color-border)]">
        <table className="w-full text-left text-[13px]">
          <thead>
            <tr className="border-b-[0.5px] border-[var(--color-border)] bg-[var(--color-bg-surface-2)]">
              <th className="px-4 py-2 font-medium text-[var(--color-text-secondary)]">
                Колонка файла
              </th>
              <th className="px-4 py-2 font-medium text-[var(--color-text-secondary)]">
                Пример значения
              </th>
              <th className="px-4 py-2 font-medium text-[var(--color-text-secondary)]">
                Поле Лид-Канал
              </th>
            </tr>
          </thead>
          <tbody>
            {columns.map((column) => (
              <tr
                key={column}
                className="border-b-[0.5px] border-[var(--color-border)] last:border-0"
              >
                <td className="px-4 py-2 text-[var(--color-text-primary)]">{column}</td>
                <td className="max-w-[220px] truncate px-4 py-2 text-[var(--color-text-secondary)]">
                  {examples[column]}
                </td>
                <td className="px-4 py-2">
                  <Select
                    value={mapping[column]}
                    onChange={(value) => handleTargetChange(column, value)}
                    options={targetOptionsForColumn(column)}
                    className="max-w-[240px]"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {error && <p className="mt-3 text-[13px] text-[#EF4444]">{error}</p>}

      <div className="mt-6 flex justify-between">
        <Button variant="secondary" type="button" onClick={onBack} disabled={isSubmitting}>
          Назад
        </Button>
        <Button variant="primary" type="button" onClick={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? 'Проверка…' : 'Далее'}
        </Button>
      </div>
    </div>
  );
}
