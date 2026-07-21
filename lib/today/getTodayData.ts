import { prisma } from '@/lib/prisma';
import { computeRiskBatch } from '@/lib/risk/computeRiskBatch';
import { getNextActions } from '@/lib/tasks/getNextActions';
import type { LeadListItem } from '@/lib/leads/getLeads';
import type { TodayBlock, TodayData, TodayLeadItem, TodayTaskItem } from '@/types/today';

const BLOCK_LIMIT = 20;
const NEW_LEAD_WINDOW_MS = 24 * 60 * 60 * 1000;

function startOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

function endOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(23, 59, 59, 999);
  return result;
}

function toBlock<T>(items: T[]): TodayBlock<T> {
  return { items: items.slice(0, BLOCK_LIMIT), total: items.length };
}

type RawTask = {
  id: string;
  title: string;
  dueDate: Date | null;
  leadId: string;
  lead: { name: string | null };
};

function toTaskItem(task: RawTask): TodayTaskItem {
  return {
    id: task.id,
    title: task.title,
    dueDate: task.dueDate ? task.dueDate.toISOString() : null,
    leadId: task.leadId,
    leadName: task.lead.name,
  };
}

/**
 * Собирает все 7 блоков «Сегодня» строго для одного пользователя за фиксированное
 * число запросов (не растёт с числом лидов/задач). companyId/userId — только из сессии.
 */
export async function getTodayData(companyId: string, userId: string): Promise<TodayData> {
  const now = new Date();

  const [company, leads] = await Promise.all([
    prisma.company.findUniqueOrThrow({
      where: { id: companyId },
      select: { settings: true },
    }),
    prisma.lead.findMany({
      where: { companyId, assignedToId: userId, closeType: null },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        source: true,
        createdAt: true,
        closeType: true,
        qualification: true,
        lossReason: { select: { id: true, label: true } },
        assignedTo: { select: { id: true, name: true } },
        stage: { select: { id: true, name: true, color: true, stageTimeLimitDays: true } },
        _count: { select: { duplicateFlagsAsLead: true } },
        duplicateFlagsAsLead: { select: { matchedLeadId: true }, take: 1 },
      },
    }),
  ]);

  const leadListItems: LeadListItem[] = leads.map((lead) => ({
    id: lead.id,
    name: lead.name,
    phone: lead.phone,
    email: lead.email,
    source: lead.source,
    createdAt: lead.createdAt.toISOString(),
    closeType: lead.closeType,
    qualification: lead.qualification,
    lossReason: lead.lossReason,
    hasDuplicate: lead._count.duplicateFlagsAsLead > 0,
    firstMatchedLeadId: lead.duplicateFlagsAsLead[0]?.matchedLeadId ?? null,
    assignedTo: lead.assignedTo,
    stage: lead.stage,
  }));

  const leadIds = leadListItems.map((lead) => lead.id);

  const [takenInWorkEvents, leadsWithRisk, nextActionsByLeadId, tasksTodayRaw, overdueTasksRaw] =
    await Promise.all([
      leadIds.length === 0
        ? Promise.resolve([])
        : prisma.event.findMany({
            where: { companyId, leadId: { in: leadIds }, type: 'LEAD_TAKEN_IN_WORK' },
            select: { leadId: true },
          }),
      computeRiskBatch(leadListItems, companyId, company.settings, prisma),
      getNextActions(leadIds, companyId),
      prisma.task.findMany({
        where: {
          companyId,
          assignedToId: userId,
          status: { in: ['TODO', 'IN_PROGRESS'] },
          // Задачи закрытых лидов не попадают в «Сегодня»: с таким лидом больше
          // не работают, а его карточка read-only — задачу оттуда уже не снять.
          lead: { closeType: null },
          dueDate: { gte: startOfDay(now), lte: endOfDay(now) },
        },
        select: { id: true, title: true, dueDate: true, leadId: true, lead: { select: { name: true } } },
        orderBy: { dueDate: 'asc' },
      }),
      prisma.task.findMany({
        where: {
          companyId,
          assignedToId: userId,
          status: { in: ['TODO', 'IN_PROGRESS'] },
          lead: { closeType: null },
          dueDate: { lt: now },
        },
        select: { id: true, title: true, dueDate: true, leadId: true, lead: { select: { name: true } } },
        orderBy: { dueDate: 'asc' },
      }),
    ]);

  const hasTakenInWorkLeadIds = new Set(
    takenInWorkEvents.map((event) => event.leadId).filter((id): id is string => id != null),
  );

  const todayLeadItems: TodayLeadItem[] = leadsWithRisk.map((lead) => ({
    ...lead,
    nextAction: nextActionsByLeadId.get(lead.id) ?? null,
  }));

  const newLeadsCutoff = now.getTime() - NEW_LEAD_WINDOW_MS;

  const newLeads: TodayLeadItem[] = [];
  const unprocessedLeads: TodayLeadItem[] = [];
  const leadsWithoutNextAction: TodayLeadItem[] = [];
  const leadsApproachingDeadline: TodayLeadItem[] = [];
  const leadsAtRisk: TodayLeadItem[] = [];

  for (const lead of todayLeadItems) {
    if (!hasTakenInWorkLeadIds.has(lead.id)) {
      unprocessedLeads.push(lead);
      if (new Date(lead.createdAt).getTime() >= newLeadsCutoff) {
        newLeads.push(lead);
      }
    }

    if (lead.nextAction === null) {
      leadsWithoutNextAction.push(lead);
    }

    if (lead.risk.level === 'yellow') {
      leadsApproachingDeadline.push(lead);
    }

    if (lead.risk.level === 'red') {
      leadsAtRisk.push(lead);
    }
  }

  return {
    newLeads: toBlock(newLeads),
    unprocessedLeads: toBlock(unprocessedLeads),
    tasksToday: toBlock(tasksTodayRaw.map(toTaskItem)),
    overdueTasks: toBlock(overdueTasksRaw.map(toTaskItem)),
    leadsWithoutNextAction: toBlock(leadsWithoutNextAction),
    leadsApproachingDeadline: toBlock(leadsApproachingDeadline),
    leadsAtRisk: toBlock(leadsAtRisk),
  };
}
