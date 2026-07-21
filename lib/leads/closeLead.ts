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

    // У закрытого лида нет следующего действия: открытые задачи и ожидающие
    // напоминания снимаются вместе с закрытием. Иначе они остались бы висеть
    // в «Сегодня» и стреляли бы по лиду, с которым больше не работают, — а
    // карточка после закрытия read-only, вручную их уже не закрыть.
    const openTasks = await tx.task.findMany({
      where: { leadId, companyId, status: { in: ['TODO', 'IN_PROGRESS'] } },
      select: { id: true },
    });

    const pendingReminders = await tx.reminder.findMany({
      where: { leadId, companyId, status: 'PENDING' },
      select: { id: true },
    });

    if (openTasks.length > 0) {
      await tx.task.updateMany({
        where: { id: { in: openTasks.map((task) => task.id) } },
        data: { status: 'CANCELLED', completedAt: null },
      });
    }

    if (pendingReminders.length > 0) {
      await tx.reminder.updateMany({
        where: { id: { in: pendingReminders.map((reminder) => reminder.id) } },
        data: { status: 'CANCELLED' },
      });
    }

    if (openTasks.length > 0 || pendingReminders.length > 0) {
      await tx.event.createMany({
        data: [
          ...openTasks.map((task) => ({
            companyId,
            leadId,
            userId,
            type: 'TASK_CANCELLED' as const,
            payload: { taskId: task.id, reason: 'LEAD_CLOSED' },
            impersonatedByPlatformAdminId: impersonatedByPlatformAdminId ?? null,
          })),
          ...pendingReminders.map((reminder) => ({
            companyId,
            leadId,
            userId,
            type: 'REMINDER_CANCELLED' as const,
            payload: { reminderId: reminder.id, reason: 'LEAD_CLOSED' },
            impersonatedByPlatformAdminId: impersonatedByPlatformAdminId ?? null,
          })),
        ],
      });
    }
  });
}
