'use client';

import { useMemo, useState } from 'react';
import Button from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { mapRow } from '@/lib/import/mapRow';
import type {
  ImportColumnMapping,
  ImportPreviewDedupResult,
  ImportReport as ImportReportType,
  ParsedRow,
} from '@/types/import';

const PREVIEW_ROW_LIMIT = 50;

interface ImportPreviewTableProps {
  fileName: string;
  rows: ParsedRow[];
  mapping: ImportColumnMapping;
  result: ImportPreviewDedupResult;
  onBack: () => void;
  onConfirmed: (report: ImportReportType) => void;
}

export default function ImportPreviewTable({
  fileName,
  rows,
  mapping,
  result,
  onBack,
  onConfirmed,
}: ImportPreviewTableProps) {
  const [confirmed, setConfirmed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const previewRows = useMemo(
    () =>
      result.rows.slice(0, PREVIEW_ROW_LIMIT).map((rowResult) => ({
        ...rowResult,
        fields: mapRow(rows[rowResult.index], mapping),
      })),
    [result.rows, rows, mapping],
  );

  async function handleConfirm(): Promise<void> {
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/import/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName, mapping, rows }),
      });
      const data: unknown = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError('Не удалось выполнить импорт. Попробуйте ещё раз.');
        return;
      }

      onConfirmed(data as ImportReportType);
    } catch {
      setError('Не удалось выполнить импорт. Попробуйте ещё раз.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div>
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Будет создано" value={result.willCreate} />
        <StatTile label="Возможных дублей" value={result.possibleDuplicates} />
        <StatTile label="Ошибок в строках" value={result.errors} />
        <StatTile label="Всего строк" value={result.totalRows} />
      </div>

      <div className="overflow-x-auto rounded-[8px] border-[0.5px] border-[var(--color-border)]">
        <table className="w-full text-left text-[13px]">
          <thead>
            <tr className="border-b-[0.5px] border-[var(--color-border)] bg-[var(--color-bg-surface-2)]">
              <th className="px-4 py-2 font-medium text-[var(--color-text-secondary)]">Имя</th>
              <th className="px-4 py-2 font-medium text-[var(--color-text-secondary)]">Телефон</th>
              <th className="px-4 py-2 font-medium text-[var(--color-text-secondary)]">Email</th>
              <th className="px-4 py-2 font-medium text-[var(--color-text-secondary)]">Статус</th>
            </tr>
          </thead>
          <tbody>
            {previewRows.map((row) => (
              <tr
                key={row.index}
                className="border-b-[0.5px] border-[var(--color-border)] last:border-0"
              >
                <td className="px-4 py-2 text-[var(--color-text-primary)]">
                  {row.fields.name ?? '—'}
                </td>
                <td className="px-4 py-2 text-[var(--color-text-secondary)]">
                  {row.fields.phone ?? '—'}
                </td>
                <td className="px-4 py-2 text-[var(--color-text-secondary)]">
                  {row.fields.email ?? '—'}
                </td>
                <td className="px-4 py-2">
                  {row.isError ? (
                    <Badge bg="var(--color-bg-surface-2)" color="var(--color-text-secondary)">
                      Пустая строка
                    </Badge>
                  ) : row.isDuplicate ? (
                    <Badge bg="#FFFBEB" color="#B45309">
                      Возможный дубль
                    </Badge>
                  ) : (
                    <Badge bg="var(--color-primary-light)" color="var(--color-primary-dark)">
                      Будет создан
                    </Badge>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {result.totalRows > PREVIEW_ROW_LIMIT && (
        <p className="mt-2 text-[12px] text-[var(--color-text-tertiary)]">
          Показаны первые {PREVIEW_ROW_LIMIT} из {result.totalRows} строк.
        </p>
      )}

      <label className="mt-4 flex items-center gap-2 text-[13px] text-[var(--color-text-primary)]">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(event) => setConfirmed(event.target.checked)}
        />
        Я проверил маппинг и хочу создать лиды, включая возможные дубли
      </label>

      {error && <p className="mt-3 text-[13px] text-[#EF4444]">{error}</p>}

      <div className="mt-6 flex justify-between">
        <Button variant="secondary" type="button" onClick={onBack} disabled={isSubmitting}>
          Назад
        </Button>
        <Button
          variant="primary"
          type="button"
          onClick={handleConfirm}
          disabled={!confirmed || isSubmitting}
        >
          {isSubmitting ? 'Импорт…' : 'Подтвердить импорт'}
        </Button>
      </div>
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[8px] border-[0.5px] border-[var(--color-border)] p-3">
      <p className="text-[20px] font-medium text-[var(--color-text-primary)]">{value}</p>
      <p className="text-[12px] text-[var(--color-text-secondary)]">{label}</p>
    </div>
  );
}
