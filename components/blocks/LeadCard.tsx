import { type ReactNode } from 'react';

interface LeadCardProps {
  name: string;
  phone?: string;
  source?: ReactNode;    // SourceBadge
  status?: ReactNode;    // StatusBadge
  manager?: string;
  onDragStart?: (e: React.DragEvent) => void;
}

export default function LeadCard({
  name,
  phone,
  source,
  status,
  manager,
  onDragStart,
}: LeadCardProps) {
  return (
    <div
      draggable={!!onDragStart}
      onDragStart={onDragStart}
      className={`
        bg-[var(--color-bg-surface)]
        border border-[var(--color-border)] border-[0.5px]
        rounded-[8px]
        p-[10px_12px]
        mb-[6px]
        cursor-grab active:cursor-grabbing
        transition-colors duration-150
        hover:border-[#10B981]
      `}
    >
      <p className="text-[13px] font-medium text-[var(--color-text-primary)] mb-1">
        {name}
      </p>
      {phone && (
        <p className="text-[12px] text-[var(--color-text-secondary)] mb-2">
          {phone}
        </p>
      )}
      {(source || status) && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {source}
          {status}
        </div>
      )}
      {manager && (
        <p className="text-[11px] text-[var(--color-text-tertiary)]">
          Менеджер: {manager}
        </p>
      )}
    </div>
  );
}
