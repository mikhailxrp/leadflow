import type { Prisma } from '@prisma/client';
import { requireCompanyUser } from '@/lib/auth/requireCompanyAccess';
import { closeLead, ValidationError } from '@/lib/leads/closeLead';
import { visibilityWhere } from '@/lib/leads/visibilityFilter';
import { prisma } from '@/lib/prisma';
import { closeLeadSchema } from '@/lib/validations/leads';
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
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  let user;
  try {
    user = await requireCompanyUser({ minRole: 'MANAGER' });
  } catch (error) {
    if (error instanceof Response) return error;
    throw error;
  }

  const { id } = await params;
  const { companyId, userId, role } = user;
  const impersonatedByPlatformAdminId = user.impersonatedByPlatformAdminId ?? null;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = closeLeadSchema.safeParse(body);
  if (!parsed.success) {
    const hasLostWithoutReason =
      body &&
      typeof body === 'object' &&
      'closeType' in body &&
      (body as Record<string, unknown>).closeType === 'LOST';
    if (hasLostWithoutReason) {
      return Response.json({ error: 'LOSS_REASON_REQUIRED' }, { status: 400 });
    }
    return Response.json({ error: 'VALIDATION_ERROR' }, { status: 400 });
  }

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

    const input = parsed.data;
    await closeLead({
      leadId: id,
      companyId,
      userId,
      closeType: input.closeType,
      lossReasonId: input.closeType === 'LOST' ? input.lossReasonId : undefined,
      impersonatedByPlatformAdminId,
    });

    return Response.json({ success: true });
  } catch (error) {
    if (error instanceof ValidationError) {
      return Response.json({ error: error.code }, { status: 400 });
    }
    console.error('[POST /api/leads/:id/close] failed:', error);
    return Response.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
