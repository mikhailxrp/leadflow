'use client';

import { useState, type ReactNode } from 'react';
import dynamic from 'next/dynamic';
import Card from '@/components/ui/Card';
import ResponseSpeedCard from '@/components/reports/ResponseSpeedCard';
import type { ReportSummary } from '@/types/reports';

const MS_PER_DAY = 86_400_000;

function ChartSkeleton(): ReactNode {
  return (
    <Card padding="lg">
      <div className="h-[240px] w-full animate-pulse rounded-[8px] bg-[var(--color-bg-surface-2)]" />
    </Card>
  );
}

// Recharts измеряет DOM для ResponsiveContainer — рендерить его только на клиенте,
// без SSR, вместо ручного "mounted"-стейта (тот паттерн ловит react-hooks/set-state-in-effect).
const LeadsOverTimeChart = dynamic(() => import('@/components/reports/LeadsOverTimeChart'), {
  ssr: false,
  loading: () => <ChartSkeleton />,
});

const StageConversionChart = dynamic(() => import('@/components/reports/StageConversionChart'), {
  ssr: false,
  loading: () => <ChartSkeleton />,
});

type ReportTab = 'overview' | 'loss-reasons' | 'by-employee' | 'by-source';

const TABS: ReadonlyArray<{ value: ReportTab; label: string }> = [
  { value: 'overview', label: 'Обзор' },
  { value: 'loss-reasons', label: 'Причины отказа' },
  { value: 'by-employee', label: 'По сотрудникам' },
  { value: 'by-source', label: 'По источникам' },
];

type PeriodPreset = 'this-month' | 'last-30-days' | 'quarter';

const PRESETS: ReadonlyArray<{ value: PeriodPreset; label: string }> = [
  { value: 'this-month', label: 'Этот месяц' },
  { value: 'last-30-days', label: '30 дней' },
  { value: 'quarter', label: 'Квартал' },
];

interface DateRange {
  from: string;
  to: string;
}

function toDayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function presetRange(preset: PeriodPreset): DateRange {
  const now = new Date();
  const to = toDayKey(now);

  if (preset === 'last-30-days') {
    const from = new Date(now.getTime() - 29 * MS_PER_DAY);
    return { from: toDayKey(from), to };
  }

  if (preset === 'quarter') {
    const quarterStartMonth = Math.floor(now.getUTCMonth() / 3) * 3;
    const from = new Date(Date.UTC(now.getUTCFullYear(), quarterStartMonth, 1));
    return { from: toDayKey(from), to };
  }

  const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  return { from: toDayKey(from), to };
}

function fieldLabelClassName(): string {
  return 'mb-1 block text-[11px] font-medium text-[var(--color-text-secondary)]';
}

function dateInputClassName(): string {
  return `
    h-[36px] w-full rounded-[6px] border border-[0.5px]
    border-[var(--color-border)] bg-[var(--color-bg-surface)]
    px-3 text-[13px] text-[var(--color-text-primary)]
    outline-none transition-colors duration-150
    focus:border-[#10B981]
  `;
}

function toggleButtonClassName(isActive: boolean): string {
  return `
    rounded-[6px] px-3 py-1.5
    text-[13px] font-medium transition-colors duration-150
    disabled:cursor-not-allowed disabled:opacity-60
    ${
      isActive
        ? 'bg-[#10B981] text-white'
        : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-surface-2)]'
    }
  `;
}

interface ReportsPageProps {
  initialSummary: ReportSummary;
  initialFrom: string;
  initialTo: string;
}

export default function ReportsPage({
  initialSummary,
  initialFrom,
  initialTo,
}: ReportsPageProps): ReactNode {
  const [activeTab, setActiveTab] = useState<ReportTab>('overview');
  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(initialTo);
  const [summary, setSummary] = useState<ReportSummary>(initialSummary);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  async function fetchSummary(nextFrom: string, nextTo: string): Promise<void> {
    if (nextFrom > nextTo) {
      setFetchError('Дата начала должна быть раньше даты окончания');
      return;
    }

    setIsLoading(true);
    setFetchError(null);

    try {
      const params = new URLSearchParams({
        from: `${nextFrom}T00:00:00.000Z`,
        to: `${nextTo}T23:59:59.999Z`,
      });
      const response = await fetch(`/api/reports/summary?${params.toString()}`);

      if (!response.ok) {
        throw new Error('Failed to fetch reports summary');
      }

      const data = (await response.json()) as ReportSummary;
      setSummary(data);
      setFrom(nextFrom);
      setTo(nextTo);
    } catch (error) {
      console.error(error);
      setFetchError('Не удалось загрузить отчёт за выбранный период');
    } finally {
      setIsLoading(false);
    }
  }

  function handlePresetClick(preset: PeriodPreset): void {
    const range = presetRange(preset);
    void fetchSummary(range.from, range.to);
  }

  function handleFromChange(nextFrom: string): void {
    void fetchSummary(nextFrom, to);
  }

  function handleToChange(nextTo: string): void {
    void fetchSummary(from, nextTo);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div
          className="
            inline-flex w-fit rounded-[8px]
            border border-[0.5px] border-[var(--color-border)]
            bg-[var(--color-bg-surface)]
            p-1
          "
          role="group"
          aria-label="Период"
        >
          {PRESETS.map((preset) => {
            const range = presetRange(preset.value);
            const isActive = range.from === from && range.to === to;

            return (
              <button
                key={preset.value}
                type="button"
                disabled={isLoading}
                onClick={() => handlePresetClick(preset.value)}
                className={toggleButtonClassName(isActive)}
              >
                {preset.label}
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-2 gap-3 sm:w-auto">
          <div>
            <label htmlFor="reports-from" className={fieldLabelClassName()}>
              С даты
            </label>
            <input
              id="reports-from"
              type="date"
              value={from}
              max={to}
              disabled={isLoading}
              onChange={(event) => handleFromChange(event.target.value)}
              className={`${dateInputClassName()} disabled:opacity-60`}
            />
          </div>
          <div>
            <label htmlFor="reports-to" className={fieldLabelClassName()}>
              По дату
            </label>
            <input
              id="reports-to"
              type="date"
              value={to}
              min={from}
              disabled={isLoading}
              onChange={(event) => handleToChange(event.target.value)}
              className={`${dateInputClassName()} disabled:opacity-60`}
            />
          </div>
        </div>
      </div>

      {fetchError && (
        <p className="text-[13px] text-[var(--color-danger)]" role="alert">
          {fetchError}
        </p>
      )}

      <div
        className="
          inline-flex w-fit rounded-[8px]
          border border-[0.5px] border-[var(--color-border)]
          bg-[var(--color-bg-surface)]
          p-1
        "
        role="tablist"
        aria-label="Раздел отчёта"
      >
        {TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={toggleButtonClassName(activeTab === tab.value)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className={isLoading ? 'opacity-60 transition-opacity duration-150' : ''}>
        {activeTab === 'overview' ? (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="lg:col-span-2">
              <LeadsOverTimeChart buckets={summary.buckets} totalLeads={summary.totalLeads} />
            </div>
            <ResponseSpeedCard
              avgFirstResponseMinutes={summary.avgFirstResponseMinutes}
              unprocessed={summary.unprocessed}
              stuck={summary.stuck}
              withoutNextAction={summary.withoutNextAction}
            />
            <StageConversionChart
              conversionByStage={summary.conversionByStage}
              wonRate={summary.wonRate}
              totalLeads={summary.totalLeads}
            />
          </div>
        ) : (
          <Card padding="lg">
            <p className="text-[14px] text-[var(--color-text-secondary)]">Раздел в разработке</p>
          </Card>
        )}
      </div>
    </div>
  );
}
