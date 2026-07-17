import type { ReactNode } from 'react';
import Card from '@/components/ui/Card';
import type { FinancialReport } from '@/types/reports';

interface FinancialReportSectionProps {
  report: FinancialReport;
}

const CURRENCY_FORMATTER = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 });

function formatMoney(value: number): string {
  return `${CURRENCY_FORMATTER.format(value)} ₽`;
}

function formatMoneyOrDash(value: number | null): string {
  return value === null ? '—' : formatMoney(value);
}

function formatPercent(value: number | null): string {
  return value === null ? '—' : `${value.toFixed(1)}%`;
}

type TileKey =
  | 'adSpend'
  | 'totalLeads'
  | 'costPerLead'
  | 'qualifiedLeads'
  | 'costPerQualifiedLead'
  | 'qualifiedRate'
  | 'revenueInProgress'
  | 'revenueCollected'
  | 'totalRevenue'
  | 'romi';

interface Tile {
  key: TileKey;
  label: string;
  format: (report: FinancialReport) => string;
}

const TILES: ReadonlyArray<Tile> = [
  { key: 'adSpend', label: 'Потрачено с НДС', format: (r) => formatMoney(r.adSpend) },
  { key: 'totalLeads', label: 'Всего лидов', format: (r) => String(r.totalLeads) },
  { key: 'costPerLead', label: 'Цена лида', format: (r) => formatMoneyOrDash(r.costPerLead) },
  { key: 'qualifiedLeads', label: 'Квал-лиды', format: (r) => String(r.qualifiedLeads) },
  {
    key: 'costPerQualifiedLead',
    label: 'Цена квал-лида',
    format: (r) => formatMoneyOrDash(r.costPerQualifiedLead),
  },
  {
    key: 'qualifiedRate',
    label: 'Доля квал-лидов',
    format: (r) => formatPercent(r.qualifiedRate),
  },
  {
    key: 'revenueInProgress',
    label: 'Выручка в работе',
    format: (r) => formatMoney(r.revenueInProgress),
  },
  {
    key: 'revenueCollected',
    label: 'Выручка в кассе',
    format: (r) => formatMoney(r.revenueCollected),
  },
  { key: 'totalRevenue', label: 'Общая выручка', format: (r) => formatMoney(r.totalRevenue) },
  { key: 'romi', label: 'ROMI', format: (r) => formatPercent(r.romi) },
];

export default function FinancialReportSection({
  report,
}: FinancialReportSectionProps): ReactNode {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {TILES.map((tile) => (
          <Card key={tile.key} padding="lg">
            <p className="mb-1 text-[11px] font-medium text-[var(--color-text-secondary)]">
              {tile.label}
            </p>
            <p className="text-[20px] font-medium leading-none text-[var(--color-text-primary)]">
              {tile.format(report)}
            </p>
          </Card>
        ))}
      </div>
      <p className="text-[11px] text-[var(--color-text-tertiary)]">
        Расход учитывается по календарным месяцам, попавшим в выбранный период — при
        произвольном (не выровненном по месяцам) диапазоне засчитывается полная сумма месяца.
      </p>
    </div>
  );
}
