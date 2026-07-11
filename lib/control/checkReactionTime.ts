import 'server-only';

import type { EventType } from '@prisma/client';
import { parseCompanySettings } from '@/lib/settings/getSettings';
import { writeEvent } from '@/lib/events';
import { notifyManagement } from '@/lib/notifications/notifyManagement';
import { notifyManager } from '@/lib/notifications/notifyManager';
import { prisma } from '@/lib/prisma';
import { resolveApplicableNorm } from '@/lib/risk/resolveApplicableNorm';
import { minutesSinceCreated } from '@/lib/risk/workHoursUtils';

export type CheckReactionTimeResult = {
  checked: number;
  reminded: number;
  overdue: number;
  escalated: number;
};

const REACTION_EVENT_TYPES: EventType[] = [
  'LEAD_TAKEN_IN_WORK',
  'LEAD_REACTION_REMINDED',
  'LEAD_REACTION_OVERDUE',
  'LEAD_REACTION_ESCALATED',
];

/**
 * Трёхступенчатая эскалация первого ответа — компании controlEnabled && !isBlocked,
 * лиды без закрытия с назначенным ответственным. Каждая ступень — once per lead, проверка
 * по наличию соответствующего события (не по времени прогона cron), LEAD_TAKEN_IN_WORK
 * останавливает всю цепочку. Норматив/проценты/рабочее время читаются один раз на компанию.
 * Вызывается из POST /api/cron/control/reaction-time, защищённого CRON_SECRET.
 */
export async function checkReactionTime(
  now: Date = new Date(),
): Promise<CheckReactionTimeResult> {
  const companies = await prisma.company.findMany({
    where: { isBlocked: false },
    select: { id: true, settings: true },
  });

  const result: CheckReactionTimeResult = {
    checked: 0,
    reminded: 0,
    overdue: 0,
    escalated: 0,
  };

  for (const company of companies) {
    const settings = parseCompanySettings(company.settings);
    if (!settings.controlEnabled) continue;

    const workHours = settings.reactionNorms.workHoursOnly
      ? settings.workHours ?? null
      : null;

    const leads = await prisma.lead.findMany({
      where: { companyId: company.id, closeType: null, assignedToId: { not: null } },
      select: {
        id: true,
        name: true,
        createdAt: true,
        source: true,
        stageId: true,
        assignedToId: true,
        assignedTo: {
          select: {
            id: true,
            companyId: true,
            name: true,
            telegramChatId: true,
            notificationPreferences: true,
          },
        },
        events: {
          where: { type: { in: REACTION_EVENT_TYPES } },
          select: { type: true },
        },
      },
    });

    for (const lead of leads) {
      result.checked += 1;

      const sent = new Set(lead.events.map((event) => event.type));
      if (sent.has('LEAD_TAKEN_IN_WORK')) continue; // цепочка остановлена целиком

      const norm = resolveApplicableNorm(
        { assignedToId: lead.assignedToId, stageId: lead.stageId, source: lead.source },
        settings.reactionNorms,
      );
      const elapsedMinutes = minutesSinceCreated(lead.createdAt, now, workHours);

      if (
        elapsedMinutes >= norm.defaultMinutes * (norm.escalateAfterPercent / 100) &&
        !sent.has('LEAD_REACTION_ESCALATED')
      ) {
        await writeEvent(company.id, 'LEAD_REACTION_ESCALATED', {
          userId: null,
          leadId: lead.id,
        });
        result.escalated += 1;

        if (lead.assignedTo) {
          await notifyManagement(company.id, 'ESCALATED', {
            name: lead.name,
            minutes: elapsedMinutes,
            manager: lead.assignedTo.name,
          });
        }
      } else if (
        elapsedMinutes >= norm.defaultMinutes &&
        !sent.has('LEAD_REACTION_OVERDUE')
      ) {
        await writeEvent(company.id, 'LEAD_REACTION_OVERDUE', {
          userId: null,
          leadId: lead.id,
        });
        result.overdue += 1;
        // Красный статус — следствие вычисления риска (computeRisk), отдельного действия не требуется.
      } else if (
        elapsedMinutes >= norm.defaultMinutes * (norm.reminderBeforePercent / 100) &&
        !sent.has('LEAD_REACTION_REMINDED')
      ) {
        await writeEvent(company.id, 'LEAD_REACTION_REMINDED', {
          userId: null,
          leadId: lead.id,
        });
        result.reminded += 1;

        if (lead.assignedTo) {
          await notifyManager(lead.assignedTo, 'REACTION_REMINDED', {
            name: lead.name,
            minutes: elapsedMinutes,
          });
        }
      }
    }
  }

  return result;
}
