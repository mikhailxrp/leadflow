import 'server-only';

import type { EventType } from '@prisma/client';
import { hasSentSummaryToday, markSummarySent } from '@/lib/control/controlSummaryMarker';
import { writeEvent } from '@/lib/events';
import { notifyManagement } from '@/lib/notifications/notifyManagement';
import { prisma } from '@/lib/prisma';
import { parseCompanySettings } from '@/lib/settings/getSettings';

export type CheckStuckLeadsResult = {
  companiesChecked: number;
  stuckFound: number;
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const STAGE_EVENT_TYPES: EventType[] = ['STAGE_CHANGED', 'LEAD_STAGE_STUCK'];

function latestEventAt(
  events: { type: EventType; createdAt: Date }[],
  type: EventType,
): Date | null {
  let latest: Date | null = null;
  for (const event of events) {
    if (event.type === type && (!latest || event.createdAt > latest)) {
      latest = event.createdAt;
    }
  }
  return latest;
}

/**
 * Раз в день, в час stuckCheckTime компании, собирает сводку лидов, зависших на этапе
 * дольше лимита (per-stage stageTimeLimitDays, иначе company-wide stageStuckDaysDefault).
 * LEAD_STAGE_STUCK — once per episode: не пишется повторно, пока лид не сменит этап
 * (episode-граница — последний STAGE_CHANGED, не факт существования события когда-либо).
 * Вызывается из POST /api/cron/control/daily, защищённого CRON_SECRET.
 */
export async function checkStuckLeads(
  now: Date = new Date(),
): Promise<CheckStuckLeadsResult> {
  const companies = await prisma.company.findMany({
    where: { isBlocked: false },
    select: { id: true, settings: true },
  });

  const result: CheckStuckLeadsResult = { companiesChecked: 0, stuckFound: 0 };

  for (const company of companies) {
    const settings = parseCompanySettings(company.settings);
    if (!settings.controlEnabled) continue;

    const targetHour = Number(settings.stuckCheckTime.split(':')[0]);
    if (now.getHours() !== targetHour) continue;
    if (await hasSentSummaryToday(company.id, 'stuck', now)) continue;

    result.companiesChecked += 1;

    const leads = await prisma.lead.findMany({
      where: { companyId: company.id, closeType: null },
      select: {
        id: true,
        name: true,
        createdAt: true,
        stage: { select: { name: true, stageTimeLimitDays: true } },
        assignedTo: { select: { name: true } },
        events: {
          where: { type: { in: STAGE_EVENT_TYPES } },
          select: { type: true, createdAt: true },
        },
      },
    });

    const stuckLeads: {
      name: string | null;
      days: number;
      stageName: string;
      managerName: string | null;
    }[] = [];

    for (const lead of leads) {
      const lastStageChangedAt = latestEventAt(lead.events, 'STAGE_CHANGED') ?? lead.createdAt;
      const limit = lead.stage.stageTimeLimitDays ?? settings.stageStuckDaysDefault;
      const daysOnStage = Math.floor(
        (now.getTime() - lastStageChangedAt.getTime()) / MS_PER_DAY,
      );

      if (daysOnStage <= limit) continue;

      const lastStuckAt = latestEventAt(lead.events, 'LEAD_STAGE_STUCK');
      if (lastStuckAt && lastStuckAt.getTime() >= lastStageChangedAt.getTime()) continue; // уже отмечен в этом эпизоде

      await writeEvent(company.id, 'LEAD_STAGE_STUCK', { userId: null, leadId: lead.id });
      result.stuckFound += 1;
      stuckLeads.push({
        name: lead.name,
        days: daysOnStage,
        stageName: lead.stage.name,
        managerName: lead.assignedTo?.name ?? null,
      });
    }

    if (stuckLeads.length > 0) {
      await notifyManagement(company.id, 'STUCK_LEADS_SUMMARY', { leads: stuckLeads });
    }

    await markSummarySent(company.id, 'stuck');
  }

  return result;
}
