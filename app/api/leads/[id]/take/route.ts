import type { Prisma } from '@prisma/client';
import { hasMinRole } from '@/constants/roles';
import { auth } from '@/lib/auth';
import { writeEvent } from '@/lib/events';
import { prisma } from '@/lib/prisma';
import { visibilityWhere } from '@/lib/leads/visibilityFilter';
import {
  DEFAULT_COMPANY_SETTINGS,
  type CompanySettings,
} from '@/constants/defaultCompanyData';

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

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const session = await auth();

  if (!session || session.kind !== 'company' || !session.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!hasMinRole(session.user.role, 'MANAGER')) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const { companyId, id: userId, role } = session.user;

  try {
    const company = await prisma.company.findUniqueOrThrow({
      where: { id: companyId },
      select: { settings: true },
    });

    const leadVisibility = getLeadVisibility(company.settings);
    const visibility = visibilityWhere(role, userId, leadVisibility);

    const andConditions: Prisma.LeadWhereInput[] = [{ id }, { companyId }];
    if (Object.keys(visibility).length > 0) {
      andConditions.push(visibility);
    }

    const lead = await prisma.lead.findFirst({
      where: { AND: andConditions },
      select: { id: true },
    });

    if (!lead) {
      return Response.json({ error: 'Not found' }, { status: 404 });
    }

    const existing = await prisma.event.findFirst({
      where: { leadId: id, companyId, type: 'LEAD_TAKEN_IN_WORK' },
      select: { id: true, createdAt: true },
    });

    if (existing) {
      return Response.json(
        { error: 'ALREADY_TAKEN', takenAt: existing.createdAt.toISOString() },
        { status: 400 },
      );
    }

    await writeEvent(companyId, 'LEAD_TAKEN_IN_WORK', { leadId: id, userId });

    return Response.json({ success: true });
  } catch (error) {
    console.error('[POST /api/leads/:id/take] failed:', error);
    return Response.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
