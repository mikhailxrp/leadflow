'use client';

import type { CloseType } from '@prisma/client';
import CloseLeadMenu from '@/components/leads/CloseLeadMenu';

interface LeadRowQuickActionsProps {
  leadId: string;
  closeType: CloseType | null;
}

export default function LeadRowQuickActions({ leadId, closeType }: LeadRowQuickActionsProps) {
  if (closeType !== null) {
    return null;
  }

  return (
    <CloseLeadMenu leadId={leadId} isClosed={false} />
  );
}
