import 'server-only';

import { hasSentSummaryToday, markSummarySent } from '@/lib/control/controlSummaryMarker';
import { notifyManagement } from '@/lib/notifications/notifyManagement';
import { prisma } from '@/lib/prisma';
import { parseCompanySettings } from '@/lib/settings/getSettings';

export type CheckEndOfDaySummaryResult = {
  companiesChecked: number;
  unhandledFound: number;
};

const DEFAULT_END_OF_DAY_HOUR = 18;

function startOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

/**
 * Раз в день, в конце рабочего дня компании (workHours.end, иначе дефолт 18:00 — workHours
 * опционален, UI настройки появится в Таске 4): отдельная от трёхступенчатой эскалации
 * сводка лидов, созданных сегодня и ни разу не переведённых в работу.
 * Вызывается из POST /api/cron/control/daily, защищённого CRON_SECRET.
 */
export async function checkEndOfDaySummary(
  now: Date = new Date(),
): Promise<CheckEndOfDaySummaryResult> {
  const companies = await prisma.company.findMany({
    where: { isBlocked: false },
    select: { id: true, settings: true },
  });

  const result: CheckEndOfDaySummaryResult = { companiesChecked: 0, unhandledFound: 0 };

  for (const company of companies) {
    const settings = parseCompanySettings(company.settings);
    if (!settings.controlEnabled) continue;

    const targetHour = settings.workHours
      ? Number(settings.workHours.end.split(':')[0])
      : DEFAULT_END_OF_DAY_HOUR;
    if (now.getHours() !== targetHour) continue;
    if (await hasSentSummaryToday(company.id, 'endOfDay', now)) continue;

    result.companiesChecked += 1;

    const leads = await prisma.lead.findMany({
      where: {
        companyId: company.id,
        closeType: null,
        createdAt: { gte: startOfDay(now) },
        events: { none: { type: 'LEAD_TAKEN_IN_WORK' } },
      },
      select: { name: true, source: true },
    });

    if (leads.length > 0) {
      result.unhandledFound += leads.length;
      await notifyManagement(company.id, 'END_OF_DAY_SUMMARY', { leads });
    }

    await markSummarySent(company.id, 'endOfDay');
  }

  return result;
}
