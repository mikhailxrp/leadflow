'use client';

import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import Card from '@/components/ui/Card';

const CHART_HEIGHT = 220;
const CHART_COLOR = 'var(--color-primary)';
const CHART_FILL = 'rgba(16, 185, 129, 0.1)';

const MOCK_CHART_DATA = [
  { day: '1 июн', leads: 6 },
  { day: '2 июн', leads: 9 },
  { day: '3 июн', leads: 7 },
  { day: '4 июн', leads: 11 },
  { day: '5 июн', leads: 10 },
  { day: '6 июн', leads: 14 },
  { day: '7 июн', leads: 12 },
];

interface ChartTooltipProps {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
}

function ChartTooltip({ active, payload, label }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-[6px] border border-[var(--color-border)] border-[0.5px] bg-[var(--color-bg-surface)] px-3 py-2 text-[12px] shadow-sm">
      <p className="text-[var(--color-text-secondary)]">{label}</p>
      <p className="font-medium text-[var(--color-text-primary)]">
        {payload[0].value} лидов
      </p>
    </div>
  );
}

export default function LeadsChart() {
  return (
    <Card padding="lg">
      <h2 className="mb-4 text-[14px] font-medium text-[var(--color-text-primary)]">
        Лиды по дням
      </h2>
      <div className="h-[220px] min-w-0 w-full">
        <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
          <AreaChart
            data={MOCK_CHART_DATA}
            margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
          >
            <XAxis
              dataKey="day"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: 'var(--color-text-tertiary)' }}
              dy={8}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: 'var(--color-text-tertiary)' }}
              width={28}
            />
            <Tooltip content={<ChartTooltip />} />
            <Area
              type="monotone"
              dataKey="leads"
              stroke={CHART_COLOR}
              strokeWidth={2}
              fill={CHART_FILL}
              dot={false}
              activeDot={{ r: 4, fill: CHART_COLOR, strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
