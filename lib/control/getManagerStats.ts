import 'server-only';

import { prisma } from '@/lib/prisma';
import { parseCompanySettings } from '@/lib/settings/getSettings';
import { resolveApplicableNorm } from '@/lib/risk/resolveApplicableNorm';
import { minutesSinceCreated } from '@/lib/risk/workHoursUtils';
import type { ManagerStat } from '@/types/control';

const STATS_EVENT_TYPES = ['LEAD_TAKEN_IN_WORK', 'LEAD_STAGE_STUCK'] as const;

/**
 * Счётчик активности по каждому сотруднику, на которого назначались лиды в периоде
 * (не только role: MANAGER — ручное назначение допускает HEAD/ADMIN, см. TASK.md).
 * Один batch-запрос лидов с событиями + один запрос пользователей — без N+1.
 */
export async function getManagerStats(
  companyId: string,
  periodStart: Date,
): Promise<ManagerStat[]> {
  const company = await prisma.company.findUniqueOrThrow({
    where: { id: companyId },
    select: { settings: true },
  });
  const settings = parseCompanySettings(company.settings);
  const workHours = settings.reactionNorms.workHoursOnly
    ? settings.workHours ?? null
    : null;

  const leads = await prisma.lead.findMany({
    where: {
      companyId,
      assignedToId: { not: null },
      createdAt: { gte: periodStart },
    },
    select: {
      assignedToId: true,
      createdAt: true,
      stageId: true,
      source: true,
      closeType: true,
      lossReasonId: true,
      events: {
        where: { type: { in: [...STATS_EVENT_TYPES] } },
        select: { type: true, createdAt: true },
      },
    },
  });

  if (leads.length === 0) {
    return [];
  }

  const managerIds = [
    ...new Set(leads.map((lead) => lead.assignedToId).filter((id): id is string => id !== null)),
  ];

  const managers = await prisma.user.findMany({
    where: { id: { in: managerIds }, companyId },
    select: { id: true, name: true, role: true, isBlocked: true },
  });
  const managerById = new Map(managers.map((manager) => [manager.id, manager]));

  const statsById = new Map<string, ManagerStat>();

  for (const lead of leads) {
    const managerId = lead.assignedToId;
    if (!managerId) continue;

    const manager = managerById.get(managerId);
    if (!manager) continue; // defense-in-depth: id resolved outside companyId scope

    let stat = statsById.get(managerId);
    if (!stat) {
      stat = {
        managerId,
        managerName: manager.name,
        role: manager.role,
        isBlocked: manager.isBlocked,
        received: 0,
        processedOnTime: 0,
        stuck: 0,
        wonCount: 0,
        lostCount: 0,
        lostWithoutReason: 0,
      };
      statsById.set(managerId, stat);
    }

    stat.received += 1;

    const takenEvent = lead.events.find((event) => event.type === 'LEAD_TAKEN_IN_WORK');
    if (takenEvent) {
      const norm = resolveApplicableNorm(
        { assignedToId: managerId, stageId: lead.stageId, source: lead.source },
        settings.reactionNorms,
      );
      const elapsedMinutes = minutesSinceCreated(
        lead.createdAt,
        takenEvent.createdAt,
        workHours,
      );

      if (elapsedMinutes <= norm.defaultMinutes) {
        stat.processedOnTime += 1;
      }
    }

    const isStuck = lead.events.some((event) => event.type === 'LEAD_STAGE_STUCK');
    if (isStuck && lead.closeType === null) {
      stat.stuck += 1;
    }

    if (lead.closeType === 'WON') {
      stat.wonCount += 1;
    } else if (lead.closeType === 'LOST') {
      stat.lostCount += 1;
      if (lead.lossReasonId === null) {
        stat.lostWithoutReason += 1;
      }
    }
  }

  return [...statsById.values()].sort((a, b) => b.received - a.received);
}
