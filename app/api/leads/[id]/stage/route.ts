import type { Prisma } from '@prisma/client';
import { hasMinRole } from '@/constants/roles';
import { auth } from '@/lib/auth';
import { getLeadVisibility, visibilityWhere } from '@/lib/leads/visibilityFilter';
import { prisma } from '@/lib/prisma';
import { changeStageSchema } from '@/lib/validations/leads';

export async function PATCH(
  request: Request,
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
  const impersonatedByPlatformAdminId =
    session.user.impersonatedByPlatformAdminId ?? null;

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
