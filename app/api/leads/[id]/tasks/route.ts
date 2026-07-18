import type { Prisma } from '@prisma/client';
import { hasMinRole } from '@/constants/roles';
import { requireCompanyUser } from '@/lib/auth/requireCompanyAccess';
import { writeEvent } from '@/lib/events';
import { visibilityWhere } from '@/lib/leads/visibilityFilter';
import { prisma } from '@/lib/prisma';
import { createTaskSchema } from '@/lib/validations/tasks';

const TASK_SELECT = {
  id: true,
  title: true,
  description: true,
  status: true,
  dueDate: true,
  completedAt: true,
  createdAt: true,
  createdById: true,
  leadId: true,
  assignedTo: { select: { id: true, name: true } },
} satisfies Prisma.TaskSelect;

async function findAccessibleLead(
  leadId: string,
  companyId: string,
  actor: Awaited<ReturnType<typeof requireCompanyUser>>,
): Promise<{ id: string } | null> {
  const visibility = visibilityWhere(actor.role, actor.userId);

  const andConditions: Prisma.LeadWhereInput[] = [{ id: leadId }, { companyId }];
  if (Object.keys(visibility).length > 0) {
    andConditions.push(visibility);
  }

  return prisma.lead.findFirst({
    where: { AND: andConditions },
    select: { id: true },
  });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  let actor;
  try {
    actor = await requireCompanyUser({ minRole: 'MANAGER' });
  } catch (error) {
    if (error instanceof Response) return error;
    throw error;
  }

  const { id } = await params;
  const { companyId } = actor;

  try {
    const lead = await findAccessibleLead(id, companyId, actor);
    if (!lead) {
      return Response.json({ error: 'Not found' }, { status: 404 });
    }

    const [activeTasks, closedTasks] = await Promise.all([
      prisma.task.findMany({
        where: { leadId: id, companyId, status: { in: ['TODO', 'IN_PROGRESS'] } },
        select: TASK_SELECT,
        orderBy: [{ dueDate: 'asc' }, { createdAt: 'asc' }],
      }),
      prisma.task.findMany({
        where: { leadId: id, companyId, status: { in: ['DONE', 'CANCELLED'] } },
        select: TASK_SELECT,
        orderBy: { completedAt: 'desc' },
      }),
    ]);

    return Response.json([...activeTasks, ...closedTasks]);
  } catch (error) {
    console.error('[GET /api/leads/:id/tasks] failed:', error);
    return Response.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  let actor;
  try {
    actor = await requireCompanyUser({ minRole: 'MANAGER' });
  } catch (error) {
    if (error instanceof Response) return error;
    throw error;
  }

  const { id } = await params;
  const { companyId, userId } = actor;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = createTaskSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: 'VALIDATION_ERROR' }, { status: 400 });
  }

  // Менеджер ставит задачи только себе — назначать других может HEAD и выше.
  if (!hasMinRole(actor.role, 'HEAD') && parsed.data.assignedToId !== userId) {
    return Response.json({ error: 'FORBIDDEN' }, { status: 403 });
  }

  try {
    const lead = await findAccessibleLead(id, companyId, actor);
    if (!lead) {
      return Response.json({ error: 'Not found' }, { status: 404 });
    }

    const assignee = await prisma.user.findFirst({
      where: { id: parsed.data.assignedToId, companyId, isBlocked: false },
      select: { id: true },
    });
    if (!assignee) {
      return Response.json({ error: 'ASSIGNEE_INVALID' }, { status: 400 });
    }

    const task = await prisma.task.create({
      data: {
        companyId,
        leadId: id,
        createdById: userId,
        assignedToId: parsed.data.assignedToId,
        title: parsed.data.title,
        description: parsed.data.description,
        dueDate: parsed.data.dueDate,
      },
      select: TASK_SELECT,
    });

    await writeEvent(companyId, 'TASK_CREATED', {
      leadId: id,
      userId,
      payload: { taskId: task.id },
    });

    return Response.json(task);
  } catch (error) {
    console.error('[POST /api/leads/:id/tasks] failed:', error);
    return Response.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
