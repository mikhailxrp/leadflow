import type { EventType, Prisma } from '@prisma/client';
import { hasMinRole } from '@/constants/roles';
import { requireCompanyUser } from '@/lib/auth/requireCompanyAccess';
import { writeEvent } from '@/lib/events';
import { prisma } from '@/lib/prisma';
import { updateTaskSchema } from '@/lib/validations/tasks';

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

async function findOwnedTask(taskId: string, leadId: string, companyId: string) {
  return prisma.task.findFirst({
    where: { id: taskId, leadId, companyId },
    select: { id: true, leadId: true, status: true, createdById: true },
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; taskId: string }> },
): Promise<Response> {
  let actor;
  try {
    actor = await requireCompanyUser({ minRole: 'MANAGER' });
  } catch (error) {
    if (error instanceof Response) return error;
    throw error;
  }

  const { id, taskId } = await params;
  const { companyId, userId, role } = actor;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = updateTaskSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: 'VALIDATION_ERROR' }, { status: 400 });
  }

  try {
    const task = await findOwnedTask(taskId, id, companyId);
    if (!task) {
      return Response.json({ error: 'Not found' }, { status: 404 });
    }

    if (task.status === 'DONE' || task.status === 'CANCELLED') {
      return Response.json({ error: 'TASK_NOT_EDITABLE' }, { status: 400 });
    }

    if (task.createdById !== userId && !hasMinRole(role, 'ADMIN')) {
      return Response.json({ error: 'FORBIDDEN' }, { status: 403 });
    }

    if (parsed.data.assignedToId) {
      const assignee = await prisma.user.findFirst({
        where: { id: parsed.data.assignedToId, companyId, isBlocked: false },
        select: { id: true },
      });
      if (!assignee) {
        return Response.json({ error: 'ASSIGNEE_INVALID' }, { status: 400 });
      }
    }

    const data: Prisma.TaskUpdateInput = {
      title: parsed.data.title,
      description: parsed.data.description,
      dueDate: parsed.data.dueDate,
      assignedTo: parsed.data.assignedToId
        ? { connect: { id: parsed.data.assignedToId } }
        : undefined,
    };

    let eventType: EventType = 'TASK_UPDATED';

    if (parsed.data.status === 'DONE') {
      data.status = 'DONE';
      data.completedAt = new Date();
      eventType = 'TASK_DONE';
    } else if (parsed.data.status === 'CANCELLED') {
      data.status = 'CANCELLED';
      data.completedAt = null;
      eventType = 'TASK_CANCELLED';
    } else if (parsed.data.status) {
      data.status = parsed.data.status;
    }

    const updated = await prisma.task.update({
      where: { id: taskId },
      data,
      select: TASK_SELECT,
    });

    await writeEvent(companyId, eventType, {
      leadId: task.leadId,
      userId,
      payload: { taskId },
    });

    return Response.json(updated);
  } catch (error) {
    console.error('[PATCH /api/leads/:id/tasks/:taskId] failed:', error);
    return Response.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; taskId: string }> },
): Promise<Response> {
  let actor;
  try {
    actor = await requireCompanyUser({ minRole: 'MANAGER' });
  } catch (error) {
    if (error instanceof Response) return error;
    throw error;
  }

  const { id, taskId } = await params;
  const { companyId, role } = actor;

  if (!hasMinRole(role, 'ADMIN')) {
    return Response.json({ error: 'FORBIDDEN' }, { status: 403 });
  }

  try {
    const task = await findOwnedTask(taskId, id, companyId);
    if (!task) {
      return Response.json({ error: 'Not found' }, { status: 404 });
    }

    await prisma.task.delete({ where: { id: taskId } });

    return Response.json({ success: true });
  } catch (error) {
    console.error('[DELETE /api/leads/:id/tasks/:taskId] failed:', error);
    return Response.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
