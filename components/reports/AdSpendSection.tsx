'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Toast from '@/components/ui/Toast';
import type { AdSpendRecord } from '@/types/reports';

const MONTH_NAMES = [
  'Январь',
  'Февраль',
  'Март',
  'Апрель',
  'Май',
  'Июнь',
  'Июль',
  'Август',
  'Сентябрь',
  'Октябрь',
  'Ноябрь',
  'Декабрь',
] as const;

const MONTH_OPTIONS = MONTH_NAMES.map((label, index) => ({
  value: String(index + 1),
  label,
}));

const CURRENCY_FORMATTER = new Intl.NumberFormat('ru-RU', {
  maximumFractionDigits: 2,
});

function formatAmount(value: number): string {
  return `${CURRENCY_FORMATTER.format(value)} ₽`;
}

function monthLabel(month: number): string {
  return MONTH_NAMES[month - 1] ?? String(month);
}

function nowYearMonth(): { year: number; month: number } {
  const now = new Date();
  return { year: now.getUTCFullYear(), month: now.getUTCMonth() + 1 };
}

function TableSkeleton(): ReactNode {
  return (
    <Card padding="lg">
      <div className="h-[160px] w-full animate-pulse rounded-[8px] bg-[var(--color-bg-surface-2)]" />
    </Card>
  );
}

export default function AdSpendSection(): ReactNode {
  const [records, setRecords] = useState<AdSpendRecord[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const defaultPeriod = nowYearMonth();
  const [year, setYear] = useState(String(defaultPeriod.year));
  const [month, setMonth] = useState(String(defaultPeriod.month));
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function load(): Promise<void> {
      try {
        const response = await fetch('/api/ad-spend');
        if (!response.ok) throw new Error('Failed to fetch');
        const data = (await response.json()) as AdSpendRecord[];
        if (!cancelled) setRecords(data);
      } catch {
        if (!cancelled) setLoadError('Не удалось загрузить расходы на рекламу');
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  function startEdit(record: AdSpendRecord): void {
    setYear(String(record.year));
    setMonth(String(record.month));
    setAmount(String(record.amountWithVat));
    setNote(record.note ?? '');
  }

  function resetForm(): void {
    const period = nowYearMonth();
    setYear(String(period.year));
    setMonth(String(period.month));
    setAmount('');
    setNote('');
  }

  async function handleSubmit(): Promise<void> {
    const parsedYear = Number(year);
    const parsedMonth = Number(month);
    const parsedAmount = Number(amount.trim().replace(',', '.'));

    if (!Number.isInteger(parsedYear) || parsedYear < 2020 || parsedYear > 2100) {
      setToast('Некорректный год');
      return;
    }
    if (!Number.isInteger(parsedMonth) || parsedMonth < 1 || parsedMonth > 12) {
      setToast('Выберите месяц');
      return;
    }
    if (!Number.isFinite(parsedAmount) || parsedAmount < 0) {
      setToast('Введите корректную сумму');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/ad-spend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          year: parsedYear,
          month: parsedMonth,
          amountWithVat: parsedAmount,
          note: note.trim() === '' ? null : note.trim(),
        }),
      });

      if (!response.ok) {
        setToast('Не удалось сохранить расход');
        return;
      }

      const saved = (await response.json()) as AdSpendRecord;
      setRecords((prev) => {
        const existing = prev ?? [];
        const withoutSaved = existing.filter(
          (r) => !(r.year === saved.year && r.month === saved.month),
        );
        return [...withoutSaved, saved].sort((a, b) =>
          a.year !== b.year ? b.year - a.year : b.month - a.month,
        );
      });
      resetForm();
    } catch {
      setToast('Ошибка сети');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Card padding="lg">
        <h3 className="mb-4 text-[14px] font-semibold text-[var(--color-text-primary)]">
          Внести расход за месяц
        </h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <Input
            label="Год"
            type="number"
            min={2020}
            max={2100}
            value={year}
            onChange={(e) => setYear(e.target.value)}
          />
          <div className="flex flex-col gap-1.5">
            <span className="text-[12px] font-normal text-[var(--color-text-secondary)]">
              Месяц
            </span>
            <Select value={month} onChange={setMonth} options={[...MONTH_OPTIONS]} />
          </div>
          <Input
            label="Расход с НДС, ₽"
            type="number"
            min={0}
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0"
          />
          <Input
            label="Заметка (необязательно)"
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Например, кабинет Директа"
          />
        </div>
        <div className="mt-4">
          <Button variant="primary" size="md" onClick={handleSubmit} disabled={saving}>
            {saving ? 'Сохранение...' : 'Сохранить'}
          </Button>
        </div>
      </Card>

      {loadError && (
        <p className="text-[13px] text-[var(--color-danger)]" role="alert">
          {loadError}
        </p>
      )}

      {records === null ? (
        <TableSkeleton />
      ) : records.length === 0 ? (
        <Card padding="lg">
          <p className="text-center text-[14px] text-[var(--color-text-secondary)]">
            Расходы на рекламу ещё не внесены
          </p>
        </Card>
      ) : (
        <>
          {/* Десктоп (≥ lg): таблица. w-full без min-width — без горизонтальной прокрутки. */}
          <Card padding="none" className="hidden overflow-hidden lg:block">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b-[0.5px] border-[var(--color-border)]">
                  <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-[0.05em] text-[var(--color-text-secondary)]">
                    Месяц
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-[0.05em] text-[var(--color-text-secondary)]">
                    Расход с НДС
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-[0.05em] text-[var(--color-text-secondary)]">
                    Заметка
                  </th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {records.map((record) => (
                  <tr
                    key={record.id}
                    className="
                      border-b-[0.5px] border-[var(--color-border)]
                      last:border-0 transition-colors duration-150
                      hover:bg-[var(--color-bg-surface-2)]
                    "
                  >
                    <td className="px-4 py-3 text-[14px] font-medium text-[var(--color-text-primary)]">
                      {monthLabel(record.month)} {record.year}
                    </td>
                    <td className="px-4 py-3 text-[13px] tabular-nums text-[var(--color-text-secondary)]">
                      {formatAmount(record.amountWithVat)}
                    </td>
                    <td className="px-4 py-3 text-[13px] text-[var(--color-text-secondary)]">
                      {record.note ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="ghost" size="sm" onClick={() => startEdit(record)}>
                        Изменить
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          {/* Мобильные/планшет (< lg): карточки — как в остальных отчётах. */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:hidden">
            {records.map((record) => (
              <div
                key={record.id}
                className="rounded-lg border-[0.5px] border-[var(--color-border)] bg-[var(--color-bg-surface)] p-4"
              >
                <div className="mb-3 flex items-center justify-between gap-3 border-b-[0.5px] border-[var(--color-border)] pb-3">
                  <span className="text-[15px] font-medium text-[var(--color-text-primary)]">
                    {monthLabel(record.month)} {record.year}
                  </span>
                  <Button variant="ghost" size="sm" onClick={() => startEdit(record)}>
                    Изменить
                  </Button>
                </div>
                <dl className="flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-[13px] text-[var(--color-text-secondary)]">Расход с НДС</dt>
                    <dd className="text-[14px] font-medium tabular-nums text-[var(--color-text-primary)]">
                      {formatAmount(record.amountWithVat)}
                    </dd>
                  </div>
                  <div className="flex items-start justify-between gap-4">
                    <dt className="flex-shrink-0 text-[13px] text-[var(--color-text-secondary)]">
                      Заметка
                    </dt>
                    <dd className="min-w-0 break-words text-right text-[13px] text-[var(--color-text-primary)]">
                      {record.note ?? '—'}
                    </dd>
                  </div>
                </dl>
              </div>
            ))}
          </div>
        </>
      )}

      {toast && <Toast title={toast} onClose={() => setToast(null)} />}
    </div>
  );
}
