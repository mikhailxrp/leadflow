import { hasMinRole } from '@/constants/roles';
import { requireCompanyUser } from '@/lib/auth/requireCompanyAccess';
import { prisma } from '@/lib/prisma';

export async function GET(): Promise<Response> {
  let actor;
  try {
    actor = await requireCompanyUser({ minRole: 'MANAGER' });
  } catch (error) {
    if (error instanceof Response) return error;
    throw error;
  }

  try {
    // Менеджер может назначать задачи только себе — HEAD и выше видят всех.
    const canAssignOthers = hasMinRole(actor.role, 'HEAD');
    const users = await prisma.user.findMany({
      where: {
        companyId: actor.companyId,
        isBlocked: false,
        ...(canAssignOthers ? {} : { id: actor.userId }),
      },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });

    return Response.json(users);
  } catch (error) {
    console.error('[GET /api/users/assignable] failed:', error);
    return Response.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
