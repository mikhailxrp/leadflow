import type { Prisma, UserRole } from '@prisma/client';
import {
  DEFAULT_COMPANY_SETTINGS,
  type CompanySettings,
} from '@/constants/defaultCompanyData';
import { hasMinRole } from '@/constants/roles';
import { auth } from '@/lib/auth';
import { writeEvent } from '@/lib/events';
import type { LeadListItem } from '@/lib/leads/getLeads';
import { visibilityWhere } from '@/lib/leads/visibilityFilter';
import { prisma } from '@/lib/prisma';
import { computeRiskBatch } from '@/lib/risk/computeRiskBatch';
import { updateLeadSchema, type UpdateLeadInput } from '@/lib/validations/leads';
import type { CompanySession } from '@/types/session';

const LEAD_CARD_SELECT = {
  id: true,
  name: true,
  phone: true,
  email: true,
  comment: true,
  source: true,
  utm: true,
  marketing: true,
  customFields: true,
  closeType: true,
  closedAt: true,
  createdAt: true,
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
  lossReason: {
    select: {
      id: true,
      label: true,
    },
  },
  _count: {
    select: {
      duplicateFlagsAsLead: true,
    },
  },
} satisfies Prisma.LeadSelect;

type LeadCardRecord = Prisma.LeadGetPayload<{ select: typeof LEAD_CARD_SELECT }>;

function getLeadVisibility(settings: unknown): CompanySettings['leadVisibility'] {
  if (
    settings &&
    typeof settings === 'object' &&
    'leadVisibility' in settings &&
    (settings.leadVisibility === 'ALL' || settings.leadVisibility === 'OWN')
  ) {
    return settings.leadVisibility;
  }

  return DEFAULT_COMPANY_SETTINGS.leadVisibility;
}

function buildLeadAccessWhere(
  id: string,
  companyId: string,
  role: UserRole,
  userId: string,
  leadVisibility: CompanySettings['leadVisibility'],
): Prisma.LeadWhereInput {
  const visibility = visibilityWhere(role, userId, leadVisibility);
  const andConditions: Prisma.LeadWhereInput[] = [{ id }, { companyId }];

  if (Object.keys(visibility).length > 0) {
    andConditions.push(visibility);
  }

  return { AND: andConditions };
}

function toNullableString(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

function buildUpdateData(input: UpdateLeadInput): Prisma.LeadUpdateInput {
  const data: Prisma.LeadUpdateInput = {};

  if (input.name !== undefined) {
    data.name = input.name;
  }

  if (input.phone !== undefined) {
    data.phone = toNullableString(input.phone);
  }

  if (input.email !== undefined) {
    data.email = toNullableString(input.email);
  }

  if (input.comment !== undefined) {
    data.comment = toNullableString(input.comment);
  }

  return data;
}

function toLeadListItem(lead: LeadCardRecord): LeadListItem {
  return {
    id: lead.id,
    name: lead.name,
    phone: lead.phone,
    email: lead.email,
    source: lead.source,
    createdAt: lead.createdAt.toISOString(),
    closeType: lead.closeType,
    hasDuplicate: lead._count.duplicateFlagsAsLead > 0,
    firstMatchedLeadId: null,
    assignedTo: lead.assignedTo,
    stage: lead.stage,
  };
}

function formatLeadCardResponse(
  lead: LeadCardRecord,
  risk: Awaited<ReturnType<typeof computeRiskBatch>>[number]['risk'],
) {
  return {
    id: lead.id,
    name: lead.name,
    phone: lead.phone,
    email: lead.email,
    comment: lead.comment,
    source: lead.source,
    utm: lead.utm,
    marketing: lead.marketing,
    customFields: lead.customFields,
    closeType: lead.closeType,
    closedAt: lead.closedAt?.toISOString() ?? null,
    createdAt: lead.createdAt.toISOString(),
    stage: lead.stage,
    assignedTo: lead.assignedTo,
    lossReason: lead.lossReason,
    duplicateFlagsAsLead: lead._count.duplicateFlagsAsLead,
    risk,
  };
}

async function recordLeadOpenedOnce(
  companyId: string,
  leadId: string,
  userId: string,
): Promise<void> {
  const existing = await prisma.event.findFirst({
    where: {
      leadId,
      userId,
      type: 'LEAD_OPENED',
    },
    select: { id: true },
  });

  if (existing) {
    return;
  }

  await writeEvent(companyId, 'LEAD_OPENED', { leadId, userId });
}

async function getCompanyLeadContext(session: CompanySession): Promise<{
  companyId: string;
  leadVisibility: CompanySettings['leadVisibility'];
  companySettings: Prisma.JsonValue;
}> {
  const company = await prisma.company.findUniqueOrThrow({
    where: { id: session.user.companyId },
    select: { settings: true },
  });

  return {
    companyId: session.user.companyId,
    leadVisibility: getLeadVisibility(company.settings),
    companySettings: company.settings,
  };
}

function unauthorizedResponse(): Response {
  return Response.json({ error: 'Unauthorized' }, { status: 401 });
}

function forbiddenResponse(): Response {
  return Response.json({ error: 'Forbidden' }, { status: 403 });
}

function notFoundResponse(): Response {
  return Response.json({ error: 'Not found' }, { status: 404 });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const session = await auth();

  if (!session || session.kind !== 'company' || !session.user) {
    return unauthorizedResponse();
  }

  if (!hasMinRole(session.user.role, 'MANAGER')) {
    return forbiddenResponse();
  }

  const { id } = await params;
  const companySession = session as CompanySession;

  try {
    const { companyId, leadVisibility, companySettings } =
      await getCompanyLeadContext(companySession);

    const where = buildLeadAccessWhere(
      id,
      companyId,
      companySession.user.role,
      companySession.user.id,
      leadVisibility,
    );

    const lead = await prisma.lead.findFirst({
      where,
      select: LEAD_CARD_SELECT,
    });

    if (!lead) {
      return notFoundResponse();
    }

    const [leadWithRisk] = await computeRiskBatch(
      [toLeadListItem(lead)],
      companySettings,
      prisma,
    );

    try {
      await recordLeadOpenedOnce(companyId, lead.id, companySession.user.id);
    } catch (error) {
      console.error('[GET /api/leads/:id] recordLeadOpenedOnce failed:', error);
    }

    return Response.json(formatLeadCardResponse(lead, leadWithRisk.risk));
  } catch (error) {
    console.error('[GET /api/leads/:id] failed:', error);
    return Response.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const session = await auth();

  if (!session || session.kind !== 'company' || !session.user) {
    return unauthorizedResponse();
  }

  if (!hasMinRole(session.user.role, 'MANAGER')) {
    return forbiddenResponse();
  }

  const { id } = await params;
  const companySession = session as CompanySession;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = updateLeadSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: 'VALIDATION_ERROR' }, { status: 400 });
  }

  const data = buildUpdateData(parsed.data);
  if (Object.keys(data).length === 0) {
    return Response.json({ error: 'VALIDATION_ERROR' }, { status: 400 });
  }

  try {
    const { companyId, leadVisibility } = await getCompanyLeadContext(companySession);

    const where = buildLeadAccessWhere(
      id,
      companyId,
      companySession.user.role,
      companySession.user.id,
      leadVisibility,
    );

    const result = await prisma.lead.updateMany({
      where,
      data,
    });

    if (result.count === 0) {
      return notFoundResponse();
    }

    await writeEvent(companyId, 'LEAD_UPDATED', {
      leadId: id,
      userId: companySession.user.id,
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error('[PATCH /api/leads/:id] failed:', error);
    return Response.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const session = await auth();

  if (!session || session.kind !== 'company' || !session.user) {
    return unauthorizedResponse();
  }

  if (!hasMinRole(session.user.role, 'ADMIN')) {
    return forbiddenResponse();
  }

  const { id } = await params;
  const companyId = session.user.companyId;

  try {
    const lead = await prisma.lead.findFirst({
      where: { id, companyId },
      select: {
        id: true,
        name: true,
        phone: true,
      },
    });

    if (!lead) {
      return notFoundResponse();
    }

    await writeEvent(companyId, 'LEAD_DELETED', {
      leadId: null,
      userId: session.user.id,
      payload: {
        deletedLeadId: lead.id,
        name: lead.name,
        phone: lead.phone,
      },
    });

    const result = await prisma.lead.deleteMany({
      where: { id, companyId },
    });

    if (result.count === 0) {
      return notFoundResponse();
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('[DELETE /api/leads/:id] failed:', error);
    return Response.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
