import { hasMinRole } from '@/constants/roles';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { updateLossReasonSchema } from '@/lib/validations/lossReasons';

const LOSS_REASON_SELECT = {
  id: true,
  label: true,
  order: true,
} as const;

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const session = await auth();

  if (!session || session.kind !== 'company' || !session.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!hasMinRole(session.user.role, 'ADMIN')) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const { companyId } = session.user;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = updateLossReasonSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: 'VALIDATION_ERROR' }, { status: 400 });
  }

  try {
    const existing = await prisma.lossReason.findFirst({
      where: { id, companyId },
      select: { id: true },
    });

    if (!existing) {
      return Response.json({ error: 'Not found' }, { status: 404 });
    }

    const updated = await prisma.lossReason.update({
      where: { id, companyId },
      data: { label: parsed.data.label },
      select: LOSS_REASON_SELECT,
    });

    return Response.json(updated);
  } catch (error) {
    console.error('[PATCH /api/loss-reasons/:id] failed:', error);
    return Response.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const session = await auth();

  if (!session || session.kind !== 'company' || !session.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!hasMinRole(session.user.role, 'ADMIN')) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const { companyId } = session.user;

  try {
    const existing = await prisma.lossReason.findFirst({
      where: { id, companyId },
      select: { id: true },
    });

    if (!existing) {
      return Response.json({ error: 'Not found' }, { status: 404 });
    }

    const usageCount = await prisma.lead.count({
      where: { lossReasonId: id, companyId },
    });

    if (usageCount > 0) {
      return Response.json({ error: 'LOSS_REASON_IN_USE' }, { status: 400 });
    }

    await prisma.lossReason.delete({
      where: { id, companyId },
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error('[DELETE /api/loss-reasons/:id] failed:', error);
    return Response.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
