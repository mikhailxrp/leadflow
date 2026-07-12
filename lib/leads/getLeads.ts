import type { CloseType, LeadQualification, Prisma } from '@prisma/client';
import { UNASSIGNED_MANAGER_ID } from '@/constants/leads';
import { visibilityWhere } from '@/lib/leads/visibilityFilter';
import { computeRiskBatch } from '@/lib/risk/computeRiskBatch';
import type { RiskResult } from '@/lib/risk/computeRisk';
import { getNextActions, type NextAction } from '@/lib/tasks/getNextActions';
import { prisma } from '@/lib/prisma';
import type { LeadsQueryInput } from '@/lib/validations/leads';
import type { CompanyActor } from '@/lib/auth/requireCompanyAccess';

const MS_PER_DAY = 86_400_000;
const PERIOD_WEEK_DAYS = 7;
const PERIOD_MONTH_DAYS = 30;

export type LeadListItem = {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  source: string;
  createdAt: string;
  closeType: CloseType | null;
  qualification: LeadQualification | null;
  lossReason: { id: string; label: string } | null;
  hasDuplicate: boolean;
  firstMatchedLeadId: string | null;
  assignedTo: { id: string; name: string } | null;
  stage: {
    id: string;
    name: string;
    color: string;
    stageTimeLimitDays: number | null;
  };
};

export type GetLeadsResult = {
  leads: LeadListItem[];
  total: number;
  page: number;
  pageSize: number;
  companySettings: Prisma.JsonValue;
};

export type GetLeadsWithRiskResult = {
  leads: Array<LeadListItem & { risk: RiskResult; nextAction: NextAction }>;
  total: number;
  page: number;
  pageSize: number;
};

function getPeriodStart(period: LeadsQueryInput['period']): Date | null {
  if (!period) {
    return null;
  }

  const now = new Date();

  if (period === 'today') {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    return start;
  }

  if (period === 'week') {
    return new Date(now.getTime() - PERIOD_WEEK_DAYS * MS_PER_DAY);
  }

  return new Date(now.getTime() - PERIOD_MONTH_DAYS * MS_PER_DAY);
}

function buildAssignedToFilter(assignedToId: string): Prisma.LeadWhereInput | null {
  if (!assignedToId) {
    return null;
  }
  return { assignedToId: assignedToId === UNASSIGNED_MANAGER_ID ? null : assignedToId };
}

function buildStatusFilter(
  status: LeadsQueryInput['status'],
): Prisma.LeadWhereInput | null {
  if (status === 'open') {
    return { closeType: null };
  }

  if (status === 'won') {
    return { closeType: 'WON' };
  }

  if (status === 'lost') {
    return { closeType: 'LOST' };
  }

  return null;
}

function buildSearchFilter(search: string): Prisma.LeadWhereInput | null {
  const trimmed = search.trim();
  if (!trimmed) {
    return null;
  }

  return {
    OR: [
      { name: { contains: trimmed, mode: 'insensitive' } },
      { email: { contains: trimmed, mode: 'insensitive' } },
      { phone: { contains: trimmed } },
    ],
  };
}

function buildWhere(
  companyId: string,
  params: LeadsQueryInput,
  actor: CompanyActor,
): Prisma.LeadWhereInput {
  // Маркетолог видит все лиды компании (как HEAD) — visibilityWhere к нему не применяется.
  const visibility = actor.actor === 'user' ? visibilityWhere(actor.role, actor.userId) : {};

  const andConditions: Prisma.LeadWhereInput[] = [{ companyId }];

  if (Object.keys(visibility).length > 0) {
    andConditions.push(visibility);
  }

  const assignedToFilter = buildAssignedToFilter(params.assignedToId);
  if (assignedToFilter) {
    andConditions.push(assignedToFilter);
  }

  const statusFilter = buildStatusFilter(params.status);
  if (statusFilter) {
    andConditions.push(statusFilter);
  }

  if (params.source) {
    andConditions.push({ source: params.source });
  }

  const searchFilter = buildSearchFilter(params.search);
  if (searchFilter) {
    andConditions.push(searchFilter);
  }

  const periodStart = getPeriodStart(params.period);
  if (periodStart) {
    andConditions.push({ createdAt: { gte: periodStart } });
  }

  return { AND: andConditions };
}

export async function getLeads(
  params: LeadsQueryInput,
  actor: CompanyActor,
): Promise<GetLeadsResult> {
  const companyId = actor.companyId;

  const company = await prisma.company.findUniqueOrThrow({
    where: { id: companyId },
    select: { settings: true },
  });

  const where = buildWhere(companyId, params, actor);
  const skip = (params.page - 1) * params.pageSize;

  const [leads, total] = await Promise.all([
    prisma.lead.findMany({
      where,
      skip,
      take: params.pageSize,
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
    prisma.lead.count({ where }),
  ]);

  const mappedLeads: LeadListItem[] = leads.map((lead) => ({
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

  return {
    leads: mappedLeads,
    total,
    page: params.page,
    pageSize: params.pageSize,
    companySettings: company.settings,
  };
}

export async function getLeadsWithRisk(
  params: LeadsQueryInput,
  actor: CompanyActor,
): Promise<GetLeadsWithRiskResult> {
  const { leads, total, page, pageSize, companySettings } = await getLeads(params, actor);

  const [leadsWithRisk, nextActions] = await Promise.all([
    computeRiskBatch(leads, actor.companyId, companySettings, prisma),
    getNextActions(leads.map((lead) => lead.id), actor.companyId),
  ]);

  return {
    leads: leadsWithRisk.map((lead) => ({
      ...lead,
      nextAction: nextActions.get(lead.id) ?? null,
    })),
    total,
    page,
    pageSize,
  };
}
