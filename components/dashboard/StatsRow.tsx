import StatCard from '@/components/blocks/StatCard';

const STATS = [
  { label: 'Всего лидов', value: 248 },
  { label: 'Новых сегодня', value: 12, accent: true },
  { label: 'В работе', value: 67 },
  { label: 'Сделок', value: 34 },
] as const;

export default function StatsRow() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {STATS.map((stat) => (
        <StatCard
          key={stat.label}
          label={stat.label}
          value={stat.value}
          accent={'accent' in stat ? stat.accent : false}
        />
      ))}
    </div>
  );
}
