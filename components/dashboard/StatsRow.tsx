import type { JSX } from 'react';
import StatCard from '@/components/blocks/StatCard';

interface StatsRowProps {
  total: number;
  newToday: number;
  inProgress: number;
  deals: number;
}

export default function StatsRow({ total, newToday, inProgress, deals }: StatsRowProps): JSX.Element {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard label="Всего лидов" value={total} />
      <StatCard label="Новых сегодня" value={newToday} accent />
      <StatCard label="В работе" value={inProgress} />
      <StatCard label="Сделок" value={deals} />
    </div>
  );
}
