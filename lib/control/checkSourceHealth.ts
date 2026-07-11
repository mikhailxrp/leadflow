import 'server-only';

import type { EventType } from '@prisma/client';
import { writeEvent } from '@/lib/events';
import { notifyManagement } from '@/lib/notifications/notifyManagement';
import { prisma } from '@/lib/prisma';
import { parseCompanySettings } from '@/lib/settings/getSettings';

export type CheckSourceHealthResult = {
  companiesChecked: number;
  down: number;
  recovered: number;
};

const MS_PER_HOUR = 60 * 60 * 1000;
const MS_PER_DAY = 24 * MS_PER_HOUR;
const STATUS_HISTORY_WINDOW_DAYS = 90;

const STATUS_EVENT_TYPES: EventType[] = ['SOURCE_DOWN', 'SOURCE_RECOVERED'];

function sourceKey(type: string, label: string): string {
  return `${type}::${label}`;
}

function readSourceIdentity(payload: unknown): { type: string; label: string } | null {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null;
  const record = payload as Record<string, unknown>;
  if (typeof record.type !== 'string' || typeof record.label !== 'string') return null;
  return { type: record.type, label: record.label };
}

/**
 * Раз в час: источник, который раньше присылал заявки (lastUsedAt != null) и молчит дольше
 * sourceHealthThresholdHours, получает SOURCE_DOWN — once per problem, через сравнение
 * последних SOURCE_DOWN/SOURCE_RECOVERED по (type, label), без поля alertedDown.
 * SOURCE_RECOVERED пишется только после подтверждённого незакрытого SOURCE_DOWN —
 * не на каждый здоровый прогон (баг примера в notifications.md).
 * Вызывается из POST /api/cron/control/source-health, защищённого CRON_SECRET.
 */
export async function checkSourceHealth(
  now: Date = new Date(),
): Promise<CheckSourceHealthResult> {
  const companies = await prisma.company.findMany({
    where: { isBlocked: false },
    select: { id: true, settings: true },
  });

  const result: CheckSourceHealthResult = { companiesChecked: 0, down: 0, recovered: 0 };

  for (const company of companies) {
    const settings = parseCompanySettings(company.settings);
    if (!settings.controlEnabled) continue;

    result.companiesChecked += 1;

    const sources = await prisma.integrationSource.findMany({
      where: { companyId: company.id, lastUsedAt: { not: null } },
      select: { type: true, label: true, lastUsedAt: true },
    });

    if (sources.length === 0) continue;

    const statusEvents = await prisma.event.findMany({
      where: {
        companyId: company.id,
        type: { in: STATUS_EVENT_TYPES },
        createdAt: { gte: new Date(now.getTime() - STATUS_HISTORY_WINDOW_DAYS * MS_PER_DAY) },
      },
      select: { type: true, payload: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });

    const lastDownByKey = new Map<string, Date>();
    const lastRecoveredByKey = new Map<string, Date>();

    for (const event of statusEvents) {
      const identity = readSourceIdentity(event.payload);
      if (!identity) continue;
      const key = sourceKey(identity.type, identity.label);

      if (event.type === 'SOURCE_DOWN' && !lastDownByKey.has(key)) {
        lastDownByKey.set(key, event.createdAt);
      }
      if (event.type === 'SOURCE_RECOVERED' && !lastRecoveredByKey.has(key)) {
        lastRecoveredByKey.set(key, event.createdAt);
      }
    }

    for (const source of sources) {
      const key = sourceKey(source.type, source.label);
      const hoursSinceLastUse = (now.getTime() - source.lastUsedAt!.getTime()) / MS_PER_HOUR;

      const lastDown = lastDownByKey.get(key) ?? null;
      const lastRecovered = lastRecoveredByKey.get(key) ?? null;
      const isMarkedDown = !!lastDown && (!lastRecovered || lastDown.getTime() > lastRecovered.getTime());

      if (hoursSinceLastUse > settings.sourceHealthThresholdHours) {
        if (isMarkedDown) continue; // уже сообщённая проблема — once per problem

        const hoursSilent = Math.round(hoursSinceLastUse);
        await writeEvent(company.id, 'SOURCE_DOWN', {
          userId: null,
          payload: { type: source.type, label: source.label, hoursSilent },
        });
        result.down += 1;
        await notifyManagement(company.id, 'SOURCE_DOWN', {
          type: source.type,
          label: source.label,
          hours: hoursSilent,
        });
      } else if (isMarkedDown) {
        await writeEvent(company.id, 'SOURCE_RECOVERED', {
          userId: null,
          payload: { type: source.type, label: source.label },
        });
        result.recovered += 1;
      }
    }
  }

  return result;
}
