import { SourceBadge, StatusBadge } from '@/components/ui/Badge';

type PipelineStatus = 'new' | 'contact' | 'in-progress' | 'warm' | 'deal';
type SourceBadgeType = 'tilda' | 'wordpress' | 'yandex' | 'api' | 'organic' | 'other';

interface LeadPreviewCardProps {
  name: string;
  phone: string;
  sourceBadge: SourceBadgeType;
  status: PipelineStatus;
  managerLabel: string;
}

export default function LeadPreviewCard({
  name,
  phone,
  sourceBadge,
  status,
  managerLabel,
}: LeadPreviewCardProps) {
  return (
    <div
      className="
        rounded-[8px] border-[0.5px] border-[var(--color-border)]
        bg-[var(--color-bg-surface-2)] p-3
      "
    >
      <p className="text-[13px] font-medium text-[var(--color-text-primary)]">{name}</p>
      <p className="mt-1 text-[12px] text-[var(--color-text-secondary)]">{phone}</p>

      <div className="mt-2 flex flex-wrap gap-1">
        <SourceBadge source={sourceBadge} />
        <StatusBadge status={status} />
      </div>

      <p className="mt-2 text-[11px] text-[var(--color-text-tertiary)]">
        Менеджер: {managerLabel}
      </p>
    </div>
  );
}
