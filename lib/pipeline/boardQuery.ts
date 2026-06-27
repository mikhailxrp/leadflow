import type { CloseType, Prisma, UserRole } from '@prisma/client';
import type { CompanySettings } from '@/constants/defaultCompanyData';
import type { LeadListItem } from '@/lib/leads/getLeads';
import { visibilityWhere } from '@/lib/leads/visibilityFilter';
import { prisma } from '@/lib/prisma';
import { computeRiskBatch } from '@/lib/risk/computeRiskBatch';
import type { RiskLevel } from '@/lib/risk/computeRisk';

const MS_PER_DAY = 86_400_000;

export type BoardLeadCard = {
  id: string;
  name: string | null;
  phone: string | null;
  source: string;
  closeType: CloseType | null;
  assignedTo: { id: string; name: string } | null;
  risk: { level: RiskLevel; reason: string | null };
};

export type BoardColumn = {
  id: string;
  name: string;
  color: string;
  order: number;
  count: number;
  avgDaysOnStage: number | null;
  leads: BoardLeadCard[];
};

export type BoardData = {
  columns: BoardColumn[];
};

export type BoardQueryOptions = {
  companyId: string;
  userId: string;
  role: UserRole;
  leadVisibility: CompanySettings['leadVisibility'];
  companySettings: Prisma.JsonValue;
  includeClosed?: boolean;
  assignedToId?: string;
};

function buildLeadWhere(options: BoardQueryOptions): Prisma.LeadWhereInput {
  const {
    companyId,
    userId,
    role,
    leadVisibility,
    includeClosed = false,
    assignedToId,
  } = options;

  const visibility = visibilityWhere(role, userId, leadVisibility);

  const andConditions: Prisma.LeadWhereInput[] = [{ companyId }];

  if (Object.keys(visibility).length > 0) {
    andConditions.push(visibility);
  }

  if (!includeClosed) {
    andConditions.push({ closeType: null });
  }

  if (assignedToId) {
    andConditions.push({ assignedToId });
  }

  return { AND: andConditions };
}

function buildLastStageChangedMap(
  events: Array<{ leadId: string | null; createdAt: Date }>,
): Map<string, Date> {
  const lastStageChangedAtByLeadId = new Map<string, Date>();

  for (const event of events) {
    if (!event.leadId || lastStageChangedAtByLeadId.has(event.leadId)) {
      continue;
    }
    lastStageChangedAtByLeadId.set(event.leadId, event.createdAt);
  }

  return lastStageChangedAtByLeadId;
}

function computeAvgDaysOnStage(
  leads: LeadListItem[],
  lastStageChangedAtByLeadId: Map<string, Date>,
  now: Date,
): number | null {
  if (leads.length === 0) {
    return null;
  }

  const totalDays = leads.reduce((sum, lead) => {
    const stageChangedAt =
      lastStageChangedAtByLeadId.get(lead.id) ?? new Date(lead.createdAt);
    const daysOnStage = (now.getTime() - stageChangedAt.getTime()) / MS_PER_DAY;
    return sum + daysOnStage;
  }, 0);

  return totalDays / leads.length;
}

function toBoardLeadCard(
  lead: LeadListItem & { risk: { level: RiskLevel; reason: string | null } },
): BoardLeadCard {
  return {
    id: lead.id,
    name: lead.name,
    phone: lead.phone,
    source: lead.source,
    closeType: lead.closeType,
    assignedTo: lead.assignedTo,
    risk: lead.risk,
  };
}

export async function getBoardData(options: BoardQueryOptions): Promise<BoardData> {
  const { companyId, companySettings } = options;
  const where = buildLeadWhere(options);
  const now = new Date();

  const [stages, leads] = await Promise.all([
    prisma.pipelineStage.findMany({
      where: { companyId },
      orderBy: { order: 'asc' },
      select: {
        id: true,
        name: true,
        color: true,
        order: true,
      },
    }),
    prisma.lead.findMany({
      where,
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        source: true,
        createdAt: true,
        closeType: true,
        stageId: true,
        lossReason: {
          select: { id: true, label: true },
        },
        assignedTo: {
          select: {
            id: true,
            name: true,
          },
        },
        stage: {
          select: {
            id: true,
            name: true,
            color: true,
            stageTimeLimitDays: true,
          },
        },
        _count: {
          select: {
            duplicateFlagsAsLead: true,
          },
        },
        duplicateFlagsAsLead: {
          select: { matchedLeadId: true },
          take: 1,
        },
      },
    }),
  ]);

  const mappedLeads: LeadListItem[] = leads.map((lead) => ({
    id: lead.id,
    name: lead.name,
    phone: lead.phone,
    email: lead.email,
    source: lead.source,
    createdAt: lead.createdAt.toISOString(),
    closeType: lead.closeType,
    lossReason: lead.lossReason,
    hasDuplicate: lead._count.duplicateFlagsAsLead > 0,
    firstMatchedLeadId: lead.duplicateFlagsAsLead[0]?.matchedLeadId ?? null,
    assignedTo: lead.assignedTo,
    stage: lead.stage,
  }));

  const leadsWithRisk = await computeRiskBatch(mappedLeads, companySettings, prisma);

  const leadIds = mappedLeads.map((lead) => lead.id);
  const stageChangedEvents =
    leadIds.length > 0
      ? await prisma.event.findMany({
          where: {
            leadId: { in: leadIds },
            type: 'STAGE_CHANGED',
          },
          select: {
            leadId: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
        })
      : [];

  const lastStageChangedAtByLeadId = buildLastStageChangedMap(stageChangedEvents);

  const leadsByStageId = new Map<string, typeof leadsWithRisk>();
  for (const lead of leadsWithRisk) {
    const stageLeads = leadsByStageId.get(lead.stage.id) ?? [];
    stageLeads.push(lead);
    leadsByStageId.set(lead.stage.id, stageLeads);
  }

  const columns: BoardColumn[] = stages.map((stage) => {
    const stageLeads = leadsByStageId.get(stage.id) ?? [];

    return {
      id: stage.id,
      name: stage.name,
      color: stage.color,
      order: stage.order,
      count: stageLeads.length,
      avgDaysOnStage: computeAvgDaysOnStage(
        stageLeads,
        lastStageChangedAtByLeadId,
        now,
      ),
      leads: stageLeads.map(toBoardLeadCard),
    };
  });

  return { columns };
}
