interface StatCardProps {
  label: string;
  value: string | number;
  accent?: boolean; // emerald color for value
}

export default function StatCard({ label, value, accent = false }: StatCardProps) {
  return (
    <div
      className={`
        bg-[var(--color-bg-surface)]
        border border-[var(--color-border)] border-[0.5px]
        rounded-[8px]
        p-[10px_12px]
      `}
    >
      <p className="text-[11px] font-medium text-[var(--color-text-secondary)] mb-1">
        {label}
      </p>
      <p
        className={`text-[20px] font-medium leading-none ${
          accent ? 'text-[#10B981]' : 'text-[var(--color-text-primary)]'
        }`}
      >
        {value}
      </p>
    </div>
  );
}
