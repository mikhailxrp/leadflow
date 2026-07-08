import { hasMinRole } from '@/constants/roles';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { updateAssignmentRuleSchema } from '@/lib/validations/assign';

const ASSIGNEE_SELECT = { id: true, name: true } as const;

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

  const parsed = updateAssignmentRuleSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: 'VALIDATION_ERROR' }, { status: 400 });
  }

  try {
    const rule = await prisma.assignmentRule.findFirst({
      where: { id, companyId },
      select: { id: true },
    });

    if (!rule) {
      return Response.json({ error: 'Not found' }, { status: 404 });
    }

    const { assignToId, fallbackToId } = parsed.data;

    if (assignToId !== undefined) {
      const assignTo = await prisma.user.findFirst({
        where: { id: assignToId, companyId },
        select: { id: true },
      });

      if (!assignTo) {
        return Response.json({ error: 'WRONG_COMPANY' }, { status: 400 });
      }
    }

    if (fallbackToId !== undefined && fallbackToId !== null) {
      const fallbackTo = await prisma.user.findFirst({
        where: { id: fallbackToId, companyId },
        select: { id: true },
      });

      if (!fallbackTo) {
        return Response.json({ error: 'WRONG_COMPANY' }, { status: 400 });
      }
    }

    const updated = await prisma.assignmentRule.update({
      where: { id },
      data: parsed.data,
      include: {
        assignTo: { select: ASSIGNEE_SELECT },
        fallbackTo: { select: ASSIGNEE_SELECT },
      },
    });

    return Response.json(updated);
  } catch (error) {
    console.error('[PATCH /api/assignment-rules/:id] failed:', error);
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
    const rule = await prisma.assignmentRule.findFirst({
      where: { id, companyId },
      select: { id: true },
    });

    if (!rule) {
      return Response.json({ error: 'Not found' }, { status: 404 });
    }

    await prisma.assignmentRule.delete({ where: { id } });

    return Response.json({ success: true });
  } catch (error) {
    console.error('[DELETE /api/assignment-rules/:id] failed:', error);
    return Response.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
