import type { Prisma } from '@prisma/client';
import { requireCompanyUser } from '@/lib/auth/requireCompanyAccess';
import { writeEvent } from '@/lib/events';
import { visibilityWhere } from '@/lib/leads/visibilityFilter';
import { prisma } from '@/lib/prisma';
import { dealValueSchema } from '@/lib/validations/leads';

export async function PATCH(
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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = dealValueSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: 'VALIDATION_ERROR' }, { status: 400 });
  }

  const { dealValueEstimated } = parsed.data;

  try {
    const visibility = visibilityWhere(role, userId);

    const andConditions: Prisma.LeadWhereInput[] = [{ id }, { companyId }];
    if (Object.keys(visibility).length > 0) {
      andConditions.push(visibility);
    }

    const lead = await prisma.lead.findFirst({
      where: { AND: andConditions },
      select: { closeType: true },
    });

    if (!lead) {
      return Response.json({ error: 'Not found' }, { status: 404 });
    }

    if (lead.closeType !== null) {
      return Response.json({ error: 'LEAD_CLOSED' }, { status: 400 });
    }

    await prisma.lead.update({
      where: { id },
      data: { dealValueEstimated },
    });

    await writeEvent(companyId, 'LEAD_DEAL_VALUE_UPDATED', {
      leadId: id,
      userId,
      payload: { value: dealValueEstimated },
    });

    return Response.json({ success: true, dealValueEstimated });
  } catch (error) {
    console.error('[PATCH /api/leads/:id/deal-value] failed:', error);
    return Response.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
