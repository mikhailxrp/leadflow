import type { Prisma } from '@prisma/client';
import { requireCompanyUser } from '@/lib/auth/requireCompanyAccess';
import { getLeadVisibility, visibilityWhere } from '@/lib/leads/visibilityFilter';
import { prisma } from '@/lib/prisma';
import { changeStageSchema } from '@/lib/validations/leads';

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
  const impersonatedByPlatformAdminId = user.impersonatedByPlatformAdminId ?? null;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = changeStageSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: 'VALIDATION_ERROR' }, { status: 400 });
  }

  const targetStageId = parsed.data.stageId;

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
      select: { stageId: true, closeType: true },
    });

    if (!lead) {
      return Response.json({ error: 'Not found' }, { status: 404 });
    }

    if (lead.closeType !== null) {
      return Response.json({ error: 'LEAD_CLOSED' }, { status: 400 });
    }

    const fromStageId = lead.stageId;

    if (fromStageId === targetStageId) {
      return Response.json({ success: true });
    }

    const targetStage = await prisma.pipelineStage.findFirst({
      where: { id: targetStageId, companyId },
      select: { id: true },
    });

    if (!targetStage) {
      return Response.json({ error: 'INVALID_STAGE' }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.lead.update({
        where: { id },
        data: { stageId: targetStageId },
      });

      await tx.event.create({
        data: {
          companyId,
          leadId: id,
          userId,
          type: 'STAGE_CHANGED',
          payload: { fromStageId, toStageId: targetStageId },
          impersonatedByPlatformAdminId,
        },
      });
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error('[PATCH /api/leads/:id/stage] failed:', error);
    return Response.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
