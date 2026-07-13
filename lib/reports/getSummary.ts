import 'server-only';

import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { computeRiskBatch, type RiskBatchLeadInput } from '@/lib/risk/computeRiskBatch';
import type { LeadsBucket, ReportSummary, StageConversionRow } from '@/types/reports';

const MS_PER_MINUTE = 60_000;

function toDayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function buildBuckets(leadDates: Date[], from: Date, to: Date): LeadsBucket[] {
  const countByDay = new Map<string, number>();
  for (const date of leadDates) {
    const key = toDayKey(date);
    countByDay.set(key, (countByDay.get(key) ?? 0) + 1);
  }

  const buckets: LeadsBucket[] = [];
  const cursor = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));
  const end = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate()));

  while (cursor.getTime() <= end.getTime()) {
    const key = toDayKey(cursor);
    buckets.push({ date: key, count: countByDay.get(key) ?? 0 });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return buckets;
}

function extractStagePayloadIds(payload: Prisma.JsonValue): {
  fromStageId: string | null;
  toStageId: string | null;
} {
  if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) {
    return { fromStageId: null, toStageId: null };
  }

  const fromStageId = typeof payload.fromStageId === 'string' ? payload.fromStageId : null;
  const toStageId = typeof payload.toStageId === 'string' ? payload.toStageId : null;

  return { fromStageId, toStageId };
}

/**
 * За from…to: totalLeads/buckets/avgFirstResponseMinutes/wonRate/conversionByStage.
 * Отдельно, независимо от периода: unprocessed/stuck/withoutNextAction — срез текущего
 * состояния всех открытых лидов компании (см. комментарий в types/reports.ts).
 */
export async function getSummary(companyId: string, from: Date, to: Date): Promise<ReportSummary> {
  const [company, periodLeads, stages] = await Promise.all([
    prisma.company.findUniqueOrThrow({
      where: { id: companyId },
      select: { settings: true },
    }),
    prisma.lead.findMany({
      where: { companyId, createdAt: { gte: from, lte: to } },
      select: { id: true, createdAt: true, closeType: true, stageId: true },
    }),
    prisma.pipelineStage.findMany({
      where: { companyId },
      orderBy: { order: 'asc' },
      select: { id: true, name: true, order: true },
    }),
  ]);

  const totalLeads = periodLeads.length;
  const periodLeadIds = periodLeads.map((lead) => lead.id);

  const [takenEvents, stageChangedEvents, openLeads] = await Promise.all([
    periodLeadIds.length === 0
      ? Promise.resolve([])
      : prisma.event.findMany({
          where: { companyId, leadId: { in: periodLeadIds }, type: 'LEAD_TAKEN_IN_WORK' },
          select: { leadId: true, createdAt: true },
        }),
    periodLeadIds.length === 0
      ? Promise.resolve([])
      : prisma.event.findMany({
          where: { companyId, leadId: { in: periodLeadIds }, type: 'STAGE_CHANGED' },
          select: { leadId: true, payload: true },
        }),
    prisma.lead.findMany({
      where: { companyId, closeType: null },
      select: {
        id: true,
        closeType: true,
        createdAt: true,
        source: true,
        assignedTo: { select: { id: true, name: true } },
        stage: { select: { id: true, name: true, color: true, stageTimeLimitDays: true } },
      },
    }),
  ]);

  const buckets = buildBuckets(
    periodLeads.map((lead) => lead.createdAt),
    from,
    to,
  );

  const firstTakenAtByLeadId = new Map<string, Date>();
  for (const event of takenEvents) {
    if (!event.leadId) continue;
    const existing = firstTakenAtByLeadId.get(event.leadId);
    if (!existing || event.createdAt < existing) {
      firstTakenAtByLeadId.set(event.leadId, event.createdAt);
    }
  }

  let respondedCount = 0;
  let totalResponseMinutes = 0;
  for (const lead of periodLeads) {
    const takenAt = firstTakenAtByLeadId.get(lead.id);
    if (takenAt) {
      respondedCount += 1;
      totalResponseMinutes += (takenAt.getTime() - lead.createdAt.getTime()) / MS_PER_MINUTE;
    }
  }
  const avgFirstResponseMinutes = respondedCount > 0 ? totalResponseMinutes / respondedCount : null;

  const wonCount = periodLeads.filter((lead) => lead.closeType === 'WON').length;
  const wonRate = totalLeads > 0 ? wonCount / totalLeads : 0;

  // Каждый лид "достиг" своего текущего этапа тривиально; STAGE_CHANGED-события
  // добавляют и fromStageId, и toStageId — стартовый этап лида нигде не фиксируется
  // отдельным событием (он неявен при создании), поэтому его можно узнать только как
  // fromStageId самого раннего перехода. Без этого лид, ушедший с первого этапа,
  // потерял бы его в подсчёте конверсии.
  const reachedStagesByLeadId = new Map<string, Set<string>>();
  for (const lead of periodLeads) {
    reachedStagesByLeadId.set(lead.id, new Set([lead.stageId]));
  }
  for (const event of stageChangedEvents) {
    if (!event.leadId) continue;
    const { fromStageId, toStageId } = extractStagePayloadIds(event.payload);
    const set = reachedStagesByLeadId.get(event.leadId);
    if (!set) continue;
    if (fromStageId) set.add(fromStageId);
    if (toStageId) set.add(toStageId);
  }

  const conversionByStage: StageConversionRow[] = stages.map((stage) => {
    let count = 0;
    for (const reached of reachedStagesByLeadId.values()) {
      if (reached.has(stage.id)) count += 1;
    }
    return { stageId: stage.id, name: stage.name, order: stage.order, count };
  });

  const riskInput: RiskBatchLeadInput[] = openLeads.map((lead) => ({
    id: lead.id,
    closeType: lead.closeType,
    assignedTo: lead.assignedTo,
    createdAt: lead.createdAt.toISOString(),
    source: lead.source,
    stage: lead.stage,
  }));

  const leadsWithRisk = await computeRiskBatch(riskInput, companyId, company.settings, prisma);

  let unprocessed = 0;
  let stuck = 0;
  let withoutNextAction = 0;
  for (const lead of leadsWithRisk) {
    if (lead.risk.reasonCode === 'NO_ASSIGNEE' || lead.risk.reasonCode === 'NO_FIRST_RESPONSE') {
      unprocessed += 1;
    } else if (lead.risk.reasonCode === 'STAGE_STUCK') {
      stuck += 1;
    } else if (lead.risk.reasonCode === 'NO_NEXT_ACTION') {
      withoutNextAction += 1;
    }
  }

  return {
    totalLeads,
    buckets,
    avgFirstResponseMinutes,
    unprocessed,
    stuck,
    withoutNextAction,
    conversionByStage,
    wonRate,
  };
}
