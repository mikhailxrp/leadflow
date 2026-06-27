import { prisma } from '@/lib/prisma';

export async function countActiveAdmins(companyId: string): Promise<number> {
  return prisma.user.count({
    where: {
      companyId,
      role: 'ADMIN',
      isBlocked: false,
    },
  });
}

export async function isLastActiveAdmin(
  companyId: string,
  userId: string,
): Promise<boolean> {
  const user = await prisma.user.findFirst({
    where: { id: userId, companyId },
    select: { id: true, role: true, isBlocked: true },
  });

  if (!user || user.role !== 'ADMIN' || user.isBlocked) {
    return false;
  }

  const activeAdminCount = await countActiveAdmins(companyId);
  return activeAdminCount === 1;
}

export async function hasDependentRecords(userId: string): Promise<boolean> {
  const [
    leadsCount,
    commentsCount,
    tasksCreatedCount,
    tasksAssignedCount,
    remindersCount,
    importBatchesCount,
    rulesAsAssigneeCount,
    rulesAsFallbackCount,
  ] = await Promise.all([
    prisma.lead.count({ where: { assignedToId: userId } }),
    prisma.comment.count({ where: { userId } }),
    prisma.task.count({ where: { createdById: userId } }),
    prisma.task.count({ where: { assignedToId: userId } }),
    prisma.reminder.count({ where: { createdById: userId } }),
    prisma.importBatch.count({ where: { createdById: userId } }),
    prisma.assignmentRule.count({ where: { assignToId: userId } }),
    prisma.assignmentRule.count({ where: { fallbackToId: userId } }),
  ]);

  return (
    leadsCount > 0 ||
    commentsCount > 0 ||
    tasksCreatedCount > 0 ||
    tasksAssignedCount > 0 ||
    remindersCount > 0 ||
    importBatchesCount > 0 ||
    rulesAsAssigneeCount > 0 ||
    rulesAsFallbackCount > 0
  );
}
