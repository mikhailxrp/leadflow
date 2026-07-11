import type { Prisma } from '@prisma/client';
import {
  DEFAULT_COMPANY_SETTINGS,
  type CompanySettings,
} from '@/constants/defaultCompanyData';
import { computeRisk, type RiskResult } from '@/lib/risk/computeRisk';
import type { LeadListItem } from '@/lib/leads/getLeads';
import type { prisma as prismaClient } from '@/lib/prisma';

type PrismaLike = typeof prismaClient;

type LeadEventRow = {
  leadId: string | null;
  type: 'LEAD_TAKEN_IN_WORK' | 'STAGE_CHANGED';
  createdAt: Date;
};

type LeadTaskRow = {
  leadId: string;
  title: string;
  dueDate: Date | null;
};

function parseCompanySettings(settings: unknown): CompanySettings {
  if (!settings || typeof settings !== 'object') {
    return DEFAULT_COMPANY_SETTINGS;
  }

  const raw = settings as Partial<CompanySettings>;

  return {
    ...DEFAULT_COMPANY_SETTINGS,
    ...raw,
    reactionNorms: {
      ...DEFAULT_COMPANY_SETTINGS.reactionNorms,
      ...raw.reactionNorms,
      bySource: raw.reactionNorms?.bySource ?? DEFAULT_COMPANY_SETTINGS.reactionNorms.bySource,
      byStage: raw.reactionNorms?.byStage ?? DEFAULT_COMPANY_SETTINGS.reactionNorms.byStage,
      byUser: raw.reactionNorms?.byUser ?? DEFAULT_COMPANY_SETTINGS.reactionNorms.byUser,
    },
  };
}

function buildEventMaps(events: LeadEventRow[]): {
  hasTakenInWorkByLeadId: Map<string, boolean>;
  lastStageChangedAtByLeadId: Map<string, Date>;
} {
  const hasTakenInWorkByLeadId = new Map<string, boolean>();
  const lastStageChangedAtByLeadId = new Map<string, Date>();

  for (const event of events) {
    if (!event.leadId) {
      continue;
    }

    if (event.type === 'LEAD_TAKEN_IN_WORK') {
      hasTakenInWorkByLeadId.set(event.leadId, true);
    }

    if (event.type === 'STAGE_CHANGED' && !lastStageChangedAtByLeadId.has(event.leadId)) {
      lastStageChangedAtByLeadId.set(event.leadId, event.createdAt);
    }
  }

  return { hasTakenInWorkByLeadId, lastStageChangedAtByLeadId };
}

function buildTaskMaps(
  tasks: LeadTaskRow[],
  now: Date,
): {
  hasOpenTaskByLeadId: Map<string, boolean>;
  overdueOpenTaskByLeadId: Map<string, { title: string }>;
} {
  const hasOpenTaskByLeadId = new Map<string, boolean>();
  const overdueOpenTaskByLeadId = new Map<string, { title: string }>();

  for (const task of tasks) {
    hasOpenTaskByLeadId.set(task.leadId, true);

    if (
      !overdueOpenTaskByLeadId.has(task.leadId) &&
      task.dueDate != null &&
      task.dueDate < now
    ) {
      overdueOpenTaskByLeadId.set(task.leadId, { title: task.title });
    }
  }

  return { hasOpenTaskByLeadId, overdueOpenTaskByLeadId };
}

export async function computeRiskBatch(
  leads: LeadListItem[],
  companyId: string,
  companySettings: Prisma.JsonValue,
  prisma: PrismaLike,
): Promise<Array<LeadListItem & { risk: RiskResult }>> {
  if (leads.length === 0) {
    return [];
  }

  const settings = parseCompanySettings(companySettings);
  const leadIds = leads.map((lead) => lead.id);
  const now = new Date();

  const [events, tasks] = await Promise.all([
    prisma.event.findMany({
      where: {
        companyId,
        leadId: { in: leadIds },
        type: { in: ['LEAD_TAKEN_IN_WORK', 'STAGE_CHANGED'] },
      },
      select: {
        leadId: true,
        type: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.task.findMany({
      where: {
        companyId,
        leadId: { in: leadIds },
        status: { in: ['TODO', 'IN_PROGRESS'] },
      },
      select: {
        leadId: true,
        title: true,
        dueDate: true,
      },
      orderBy: { dueDate: 'asc' },
    }),
  ]);

  const { hasTakenInWorkByLeadId, lastStageChangedAtByLeadId } = buildEventMaps(
    events as LeadEventRow[],
  );
  const { hasOpenTaskByLeadId, overdueOpenTaskByLeadId } = buildTaskMaps(
    tasks as LeadTaskRow[],
    now,
  );

  return leads.map((lead) => {
    const createdAt = new Date(lead.createdAt);

    const risk = computeRisk({
      lead: {
        id: lead.id,
        closeType: lead.closeType,
        assignedToId: lead.assignedTo?.id ?? null,
        createdAt,
        source: lead.source,
        stageId: lead.stage.id,
      },
      hasTakenInWork: hasTakenInWorkByLeadId.get(lead.id) ?? false,
      lastStageChangedAt: lastStageChangedAtByLeadId.get(lead.id) ?? createdAt,
      currentStage: { stageTimeLimitDays: lead.stage.stageTimeLimitDays },
      companySettings: {
        stageStuckDaysDefault: settings.stageStuckDaysDefault,
        reactionNorms: settings.reactionNorms,
        workHours: settings.workHours,
      },
      hasOpenTask: hasOpenTaskByLeadId.has(lead.id),
      overdueOpenTask: overdueOpenTaskByLeadId.get(lead.id) ?? null,
      now,
    });

    return { ...lead, risk };
  });
}
