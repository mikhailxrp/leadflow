import type { CloseType } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export class ValidationError extends Error {
  constructor(public code: string) {
    super(code);
    this.name = 'ValidationError';
  }
}

export type CloseLeadParams = {
  leadId: string;
  companyId: string;
  userId: string;
  closeType: CloseType;
  lossReasonId?: string;
  impersonatedByPlatformAdminId?: string | null;
};

export async function closeLead({
  leadId,
  companyId,
  userId,
  closeType,
  lossReasonId,
  impersonatedByPlatformAdminId,
}: CloseLeadParams): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.lead.findFirstOrThrow({ where: { id: leadId, companyId } });

    if (closeType === 'LOST' && !lossReasonId) {
      throw new ValidationError('LOSS_REASON_REQUIRED');
    }

    if (closeType === 'LOST' && lossReasonId) {
      const reason = await tx.lossReason.findFirst({ where: { id: lossReasonId, companyId } });
      if (!reason) throw new ValidationError('LOSS_REASON_INVALID');
    }

    await tx.lead.updateMany({
      where: { id: leadId, companyId },
      data: {
        closeType,
        closedAt: new Date(),
        lossReasonId: closeType === 'LOST' ? lossReasonId : null,
      },
    });

    await tx.event.create({
      data: {
        companyId,
        leadId,
        userId,
        type: closeType === 'WON' ? 'LEAD_WON' : 'LEAD_LOST',
        payload: closeType === 'LOST' ? { lossReasonId } : {},
        impersonatedByPlatformAdminId: impersonatedByPlatformAdminId ?? null,
      },
    });
  });
}
