import type { Prisma } from '@prisma/client';
import { requireCompanyUser } from '@/lib/auth/requireCompanyAccess';
import { closeLead, ValidationError } from '@/lib/leads/closeLead';
import { visibilityWhere } from '@/lib/leads/visibilityFilter';
import { prisma } from '@/lib/prisma';
import { closeLeadSchema } from '@/lib/validations/leads';

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
    const closeType =
      body && typeof body === 'object' && 'closeType' in body
        ? (body as Record<string, unknown>).closeType
        : undefined;
    if (closeType === 'LOST') {
      return Response.json({ error: 'LOSS_REASON_REQUIRED' }, { status: 400 });
    }
    if (closeType === 'WON') {
      return Response.json({ error: 'DEAL_VALUE_REQUIRED' }, { status: 400 });
    }
    return Response.json({ error: 'VALIDATION_ERROR' }, { status: 400 });
  }

  try {
    const visibility = visibilityWhere(role, userId);

    const andConditions: Prisma.LeadWhereInput[] = [{ id }, { companyId }];
    if (Object.keys(visibility).length > 0) {
      andConditions.push(visibility);
    }

    const lead = await prisma.lead.findFirst({
      where: { AND: andConditions },
      select: { id: true, closeType: true },
    });

    if (!lead) {
      return Response.json({ error: 'Not found' }, { status: 404 });
    }

    // Повторное закрытие переписало бы closedAt и сумму сделки задним числом.
    if (lead.closeType !== null) {
      return Response.json({ error: 'LEAD_CLOSED' }, { status: 400 });
    }

    const input = parsed.data;
    await closeLead({
      leadId: id,
      companyId,
      userId,
      closeType: input.closeType,
      lossReasonId: input.closeType === 'LOST' ? input.lossReasonId : undefined,
      dealValueFinal: input.closeType === 'WON' ? input.dealValueFinal : undefined,
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
