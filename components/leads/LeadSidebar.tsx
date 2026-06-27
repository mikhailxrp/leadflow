'use client';

import type { CloseType } from '@prisma/client';
import Card from '@/components/ui/Card';
import TakeInWorkButton from '@/components/leads/TakeInWorkButton';
import CloseLeadMenu from '@/components/leads/CloseLeadMenu';

const CLOSE_TYPE_LABELS: Record<CloseType, string> = {
  WON: 'Сделка',
  LOST: 'Отказ',
};

const CLOSE_TYPE_COLORS: Record<CloseType, string> = {
  WON: 'bg-[#D1FAE5] text-[#065F46]',
  LOST: 'bg-[#FEE2E2] text-[#991B1B]',
};

interface LeadSidebarProps {
  leadId: string;
  hasTakenInWork: boolean;
  takenAt: string | null;
  closeType: CloseType | null;
  assignedTo: { name: string } | null;
}

export default function LeadSidebar({
  leadId,
  hasTakenInWork,
  takenAt,
  closeType,
  assignedTo,
}: LeadSidebarProps) {
  return (
    <Card padding="lg">
      <h2 className="mb-4 text-[14px] font-medium text-[var(--color-text-primary)]">
        Работа с лидом
      </h2>

      <div className="mb-5 flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <span className="text-[12px] font-normal text-[var(--color-text-secondary)]">
            Ответственный
          </span>
          <span className="text-[13px] text-[var(--color-text-primary)]">
            {assignedTo?.name ?? (
              <span className="text-[var(--color-text-tertiary)]">Не назначен</span>
            )}
          </span>
        </div>

        {closeType !== null && (
          <div className="flex flex-col gap-1.5">
            <span className="text-[12px] font-normal text-[var(--color-text-secondary)]">
              Статус
            </span>
            <span
              className={`inline-flex w-fit items-center rounded-full px-2.5 py-0.5 text-[12px] font-medium ${CLOSE_TYPE_COLORS[closeType]}`}
            >
              {CLOSE_TYPE_LABELS[closeType]}
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <TakeInWorkButton
          leadId={leadId}
          hasTakenInWork={hasTakenInWork}
          takenAt={takenAt}
        />
        <CloseLeadMenu leadId={leadId} isClosed={closeType !== null} />
      </div>
    </Card>
  );
}
