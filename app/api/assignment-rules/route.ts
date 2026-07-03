import { hasMinRole } from '@/constants/roles';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createAssignmentRuleSchema } from '@/lib/validations/assign';

const ASSIGNEE_SELECT = { id: true, name: true } as const;

export async function GET(): Promise<Response> {
  const session = await auth();

  if (!session || session.kind !== 'company' || !session.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!hasMinRole(session.user.role, 'ADMIN')) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { companyId } = session.user;

  try {
    const rules = await prisma.assignmentRule.findMany({
      where: { companyId },
      orderBy: { priority: 'asc' },
      include: {
        assignTo: { select: ASSIGNEE_SELECT },
        fallbackTo: { select: ASSIGNEE_SELECT },
      },
    });

    return Response.json(rules);
  } catch (error) {
    console.error('[GET /api/assignment-rules] failed:', error);
    return Response.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

export async function POST(request: Request): Promise<Response> {
  const session = await auth();

  if (!session || session.kind !== 'company' || !session.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!hasMinRole(session.user.role, 'ADMIN')) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { companyId } = session.user;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = createAssignmentRuleSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: 'VALIDATION_ERROR' }, { status: 400 });
  }

  const { assignToId, fallbackToId } = parsed.data;

  try {
    const assignTo = await prisma.user.findFirst({
      where: { id: assignToId, companyId },
      select: { id: true },
    });

    if (!assignTo) {
      return Response.json({ error: 'WRONG_COMPANY' }, { status: 400 });
    }

    if (fallbackToId !== null) {
      const fallbackTo = await prisma.user.findFirst({
        where: { id: fallbackToId, companyId },
        select: { id: true },
      });

      if (!fallbackTo) {
        return Response.json({ error: 'WRONG_COMPANY' }, { status: 400 });
      }
    }

    const created = await prisma.assignmentRule.create({
      data: { ...parsed.data, companyId },
      include: {
        assignTo: { select: ASSIGNEE_SELECT },
        fallbackTo: { select: ASSIGNEE_SELECT },
      },
    });

    return Response.json(created, { status: 201 });
  } catch (error) {
    console.error('[POST /api/assignment-rules] failed:', error);
    return Response.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
