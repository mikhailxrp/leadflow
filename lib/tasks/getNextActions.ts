import { prisma } from '@/lib/prisma';

export type NextAction = {
  taskId: string;
  title: string;
  dueDate: string | null;
  createdById: string;
} | null;

/**
 * Батч-резолвер «следующего действия» лида: самая ранняя открытая задача
 * (dueDate ASC, null — последними, затем createdAt ASC) — как в GET /api/leads/:id/tasks.
 *
 * Закрытые лиды всегда возвращают null: у лида, с которым больше не работают,
 * следующего действия нет по определению — ни задачи, ни предупреждения о её
 * отсутствии. Фильтр по lead.closeType, а не только по статусу задачи, — из-за
 * лидов, закрытых до автоотмены задач в closeLead.
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
      lead: { closeType: null },
    },
    select: {
      id: true,
      leadId: true,
      title: true,
      dueDate: true,
      createdById: true,
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
      createdById: task.createdById,
    });
  }

  for (const leadId of leadIds) {
    if (!result.has(leadId)) {
      result.set(leadId, null);
    }
  }

  return result;
}
