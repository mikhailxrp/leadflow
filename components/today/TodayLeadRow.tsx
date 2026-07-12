import { type ReactNode } from 'react';
import Link from 'next/link';
import RiskBadge from '@/components/leads/RiskBadge';
import LeadRowQuickActions from '@/components/leads/LeadRowQuickActions';
import type { TodayLeadItem } from '@/types/today';

interface TodayLeadRowProps {
  lead: TodayLeadItem;
  currentUserId: string;
  isAdmin: boolean;
}

export default function TodayLeadRow({
  lead,
  currentUserId,
  isAdmin,
}: TodayLeadRowProps): ReactNode {
  const canEditNextAction = lead.nextAction
    ? isAdmin || lead.nextAction.createdById === currentUserId
    : true;

  return (
    <div className="flex h-full flex-col gap-3 rounded-[10px] border border-[0.5px] border-[var(--color-border)] bg-[var(--color-bg-surface)] p-3 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <Link href={`/leads/${lead.id}`} className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-medium text-[var(--color-text-primary)] transition-colors hover:text-[var(--color-primary)]">
            {lead.name ?? '—'}
          </p>
          {lead.phone && (
            <p className="mt-0.5 truncate text-[12px] text-[var(--color-text-tertiary)]">
              {lead.phone}
            </p>
          )}
        </Link>

        <RiskBadge level={lead.risk.level} reason={lead.risk.reason} />
      </div>

      <LeadRowQuickActions
        leadId={lead.id}
        closeType={lead.closeType}
        nextAction={lead.nextAction}
        canEditNextAction={canEditNextAction}
        showActions
      />
    </div>
  );
}
