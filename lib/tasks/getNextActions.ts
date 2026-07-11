import { prisma } from '@/lib/prisma';

export type NextAction = {
  taskId: string;
  title: string;
  dueDate: string | null;
} | null;

/**
 * Батч-резолвер «следующего действия» лида: самая ранняя открытая задача
 * (dueDate ASC, null — последними, затем createdAt ASC) — как в GET /api/leads/:id/tasks.
 */
export async function getNextActions(
  leadIds: string[],
  companyId: string,
): Promise<Map<string, NextAction>> {
  const result = new Map<string, NextAction>();

  if (leadIds.length === 0) {
    return result;
  }

  const tasks = await prisma.task.findMany({
    where: {
      companyId,
      leadId: { in: leadIds },
      status: { in: ['TODO', 'IN_PROGRESS'] },
    },
    select: {
      id: true,
      leadId: true,
      title: true,
      dueDate: true,
    },
    orderBy: [{ dueDate: 'asc' }, { createdAt: 'asc' }],
  });

  for (const task of tasks) {
    if (result.has(task.leadId)) {
      continue;
    }
    result.set(task.leadId, {
      taskId: task.id,
      title: task.title,
      dueDate: task.dueDate ? task.dueDate.toISOString() : null,
    });
  }

  for (const leadId of leadIds) {
    if (!result.has(leadId)) {
      result.set(leadId, null);
    }
  }

  return result;
}
