import { prisma } from '@/lib/prisma';

export type ManagerOption = {
  id: string;
  name: string;
};

export async function getManagers(companyId: string): Promise<ManagerOption[]> {
  return prisma.user.findMany({
    where: {
      companyId,
      isBlocked: false,
    },
    select: {
      id: true,
      name: true,
    },
    orderBy: { name: 'asc' },
  });
}
