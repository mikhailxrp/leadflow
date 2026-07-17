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
  /**
   * «Выручка в кассе» — фактическая сумма сделки (WON). Опциональна здесь:
   * обязательность проверяет Zod в POST /api/leads/:id/close, не доменный слой.
   */
  dealValueFinal?: number;
  impersonatedByPlatformAdminId?: string | null;
};

export async function closeLead({
  leadId,
  companyId,
  userId,
  closeType,
  lossReasonId,
  dealValueFinal,
  impersonatedByPlatformAdminId,
}: CloseLeadParams): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const lead = await tx.lead.findFirstOrThrow({
      where: { id: leadId, companyId },
      select: { dealValueEstimated: true },
    });

    if (closeType === 'LOST' && !lossReasonId) {
      throw new ValidationError('LOSS_REASON_REQUIRED');
    }

    if (closeType === 'LOST' && lossReasonId) {
      const reason = await tx.lossReason.findFirst({ where: { id: lossReasonId, companyId } });
      if (!reason) throw new ValidationError('LOSS_REASON_INVALID');
    }

    // Прежняя «выручка в работе» — только для истории в payload LEAD_WON.
    // Decimal не является валидным JSON-значением: конвертируем в число.
    const dealValueEstimatedBefore =
      lead.dealValueEstimated === null ? null : Number(lead.dealValueEstimated);

    await tx.lead.updateMany({
      where: { id: leadId, companyId },
      data: {
        closeType,
        closedAt: new Date(),
        lossReasonId: closeType === 'LOST' ? lossReasonId : null,
        // Только WON: лид уходит из «выручки в работе» в «выручку в кассе»,
        // без двойного счёта в общей выручке. LOST денежные поля не трогает —
        // его из «в работе» исключает скоуп closeType IS NULL в отчёте.
        ...(closeType === 'WON'
          ? {
              dealValueEstimated: 0,
              ...(dealValueFinal === undefined ? {} : { dealValueFinal }),
            }
          : {}),
      },
    });

    await tx.event.create({
      data: {
        companyId,
        leadId,
        userId,
        type: closeType === 'WON' ? 'LEAD_WON' : 'LEAD_LOST',
        payload:
          closeType === 'LOST'
            ? { lossReasonId }
            : { dealValueFinal: dealValueFinal ?? null, dealValueEstimatedBefore },
        impersonatedByPlatformAdminId: impersonatedByPlatformAdminId ?? null,
      },
    });
  });
}
