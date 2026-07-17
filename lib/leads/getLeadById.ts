import type { CloseType, EventType, LeadQualification, Prisma } from '@prisma/client';
import { visibilityWhere } from '@/lib/leads/visibilityFilter';
import { prisma } from '@/lib/prisma';
import { computeRiskBatch } from '@/lib/risk/computeRiskBatch';
import type { RiskResult } from '@/lib/risk/computeRisk';
import type { CompanyActor } from '@/lib/auth/requireCompanyAccess';

export interface LeadHistoryEvent {
  id: string;
  type: EventType;
  createdAt: Date;
  userName: string | null;
  lossReasonLabel: string | null;
}

export interface LeadDuplicateItem {
  id: string;
  matchType: 'PHONE' | 'EMAIL';
  matchedLead: { id: string; name: string | null; phone: string | null };
}

export interface LeadDetail {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  comment: string | null;
  source: string;
  createdAt: Date;
  closeType: CloseType | null;
  closedAt: Date | null;
  dealValueEstimated: number | null;
  qualification: LeadQualification | null;
  qualifiedAt: Date | null;
  lossReason: { id: string; label: string } | null;
  assignedTo: { id: string; name: string } | null;
  stage: { id: string; name: string; color: string; stageTimeLimitDays: number | null };
  utm: Record<string, unknown>;
  marketing: Record<string, unknown>;
  customFields: Record<string, unknown>;
  hasTakenInWork: boolean;
  takenAt: Date | null;
  hasDuplicate: boolean;
  risk: RiskResult;
  comments: Array<{ id: string; text: string; createdAt: Date; user: { name: string } }>;
  events: LeadHistoryEvent[];
  duplicates: LeadDuplicateItem[];
}

function toJsonRecord(value: Prisma.JsonValue): Record<string, unknown> {
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function extractLossReasonId(payload: Prisma.JsonValue): string | null {
  if (
    typeof payload === 'object' &&
    payload !== null &&
    !Array.isArray(payload) &&
    'lossReasonId' in payload &&
    typeof (payload as Record<string, unknown>).lossReasonId === 'string'
  ) {
    return (payload as Record<string, unknown>).lossReasonId as string;
  }
  return null;
}

export async function getLeadById(
  id: string,
  actor: CompanyActor,
): Promise<LeadDetail | null> {
  const { companyId } = actor;

  const company = await prisma.company.findUniqueOrThrow({
    where: { id: companyId },
    select: { settings: true },
  });

  // Маркетолог видит все лиды компании (как HEAD) — visibilityWhere к нему не применяется.
  const visibility = actor.actor === 'user' ? visibilityWhere(actor.role, actor.userId) : {};

  const andConditions: Prisma.LeadWhereInput[] = [{ id }, { companyId }];
  if (Object.keys(visibility).length > 0) {
    andConditions.push(visibility);
  }

  const [lead, rawEvents] = await Promise.all([
    prisma.lead.findFirst({
      where: { AND: andConditions },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        comment: true,
        source: true,
        createdAt: true,
        closeType: true,
        closedAt: true,
        dealValueEstimated: true,
        qualification: true,
        qualifiedAt: true,
        utm: true,
        marketing: true,
        customFields: true,
        stage: {
          select: { id: true, name: true, color: true, stageTimeLimitDays: true },
        },
        assignedTo: {
          select: { id: true, name: true },
        },
        lossReason: {
          select: { id: true, label: true },
        },
        comments: {
          select: {
            id: true,
            text: true,
            createdAt: true,
            user: { select: { name: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
        _count: {
          select: {
            duplicateFlagsAsLead: true,
            duplicateFlagsAsMatched: true,
          },
        },
      },
    }),
    prisma.event.findMany({
      where: { leadId: id, companyId },
      select: { id: true, type: true, createdAt: true, userId: true, payload: true },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  if (!lead) return null;

  const hasDuplicate =
    lead._count.duplicateFlagsAsLead > 0 || lead._count.duplicateFlagsAsMatched > 0;

  // Extract hasTakenInWork and takenAt (earliest LEAD_TAKEN_IN_WORK event)
  const takenEvents = rawEvents.filter((e) => e.type === 'LEAD_TAKEN_IN_WORK');
  const hasTakenInWork = takenEvents.length > 0;
  // Events are ordered desc, so last element = earliest occurrence
  const takenAt = hasTakenInWork ? takenEvents[takenEvents.length - 1].createdAt : null;

  // Collect unique userIds and lossReasonIds for resolution
  const userIds = [
    ...new Set(
      rawEvents.map((e) => e.userId).filter((uid): uid is string => uid !== null),
    ),
  ];
  const lossReasonIds = [
    ...new Set(
      rawEvents
        .filter((e) => e.type === 'LEAD_LOST')
        .map((e) => extractLossReasonId(e.payload))
        .filter((lid): lid is string => lid !== null),
    ),
  ];

  // Fetch duplicates (both directions)
  const [users, lossReasons, duplicateFlags, withRisk] = await Promise.all([
    userIds.length > 0
      ? prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, name: true },
        })
      : Promise.resolve([]),
    lossReasonIds.length > 0
      ? prisma.lossReason.findMany({
          where: { id: { in: lossReasonIds } },
          select: { id: true, label: true },
        })
      : Promise.resolve([]),
    prisma.duplicateFlag.findMany({
      where: {
        companyId,
        OR: [{ leadId: id }, { matchedLeadId: id }],
      },
      select: { id: true, leadId: true, matchedLeadId: true, matchType: true },
    }),
    computeRiskBatch(
      [
        {
          id: lead.id,
          name: lead.name,
          phone: lead.phone,
          email: lead.email,
          source: lead.source,
          createdAt: lead.createdAt.toISOString(),
          closeType: lead.closeType,
          qualification: lead.qualification,
          lossReason: lead.lossReason,
          hasDuplicate,
          firstMatchedLeadId: null,
          assignedTo: lead.assignedTo,
          stage: lead.stage,
        },
      ],
      companyId,
      company.settings,
      prisma,
    ),
  ]);

  // Resolve other-side lead IDs from duplicate flags
  const otherLeadIds = duplicateFlags.map((flag) =>
    flag.leadId === id ? flag.matchedLeadId : flag.leadId,
  );

  const otherLeads =
    otherLeadIds.length > 0
      ? await prisma.lead.findMany({
          where: { id: { in: otherLeadIds }, companyId },
          select: { id: true, name: true, phone: true },
        })
      : [];

  const otherLeadMap = new Map(otherLeads.map((l) => [l.id, l]));

  const duplicates: LeadDuplicateItem[] = duplicateFlags
    .map((flag) => {
      const otherId = flag.leadId === id ? flag.matchedLeadId : flag.leadId;
      const otherLead = otherLeadMap.get(otherId);
      if (!otherLead) return null;
      return {
        id: flag.id,
        matchType: flag.matchType,
        matchedLead: { id: otherLead.id, name: otherLead.name, phone: otherLead.phone },
      };
    })
    .filter((d): d is LeadDuplicateItem => d !== null);

  // Build lookup maps
  const userMap = new Map(users.map((u) => [u.id, u.name]));
  const lossReasonMap = new Map(lossReasons.map((lr) => [lr.id, lr.label]));

  const events: LeadHistoryEvent[] = rawEvents.map((event) => {
    const lossReasonId =
      event.type === 'LEAD_LOST' ? extractLossReasonId(event.payload) : null;
    return {
      id: event.id,
      type: event.type,
      createdAt: event.createdAt,
      userName: event.userId ? (userMap.get(event.userId) ?? null) : null,
      lossReasonLabel: lossReasonId ? (lossReasonMap.get(lossReasonId) ?? null) : null,
    };
  });

  return {
    id: lead.id,
    name: lead.name,
    phone: lead.phone,
    email: lead.email,
    comment: lead.comment,
    source: lead.source,
    createdAt: lead.createdAt,
    closeType: lead.closeType,
    closedAt: lead.closedAt,
    dealValueEstimated:
      lead.dealValueEstimated === null ? null : Number(lead.dealValueEstimated),
    qualification: lead.qualification,
    qualifiedAt: lead.qualifiedAt,
    lossReason: lead.lossReason,
    assignedTo: lead.assignedTo,
    stage: lead.stage,
    utm: toJsonRecord(lead.utm),
    marketing: toJsonRecord(lead.marketing),
    customFields: toJsonRecord(lead.customFields),
    hasTakenInWork,
    takenAt,
    hasDuplicate,
    risk: withRisk[0].risk,
    comments: lead.comments,
    events,
    duplicates,
  };
}
