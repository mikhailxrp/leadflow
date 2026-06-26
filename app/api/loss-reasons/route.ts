import { hasMinRole } from '@/constants/roles';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(): Promise<Response> {
  const session = await auth();

  if (!session || session.kind !== 'company' || !session.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!hasMinRole(session.user.role, 'MANAGER')) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { companyId } = session.user;

  try {
    const lossReasons = await prisma.lossReason.findMany({
      where: { companyId },
      orderBy: { order: 'asc' },
      select: { id: true, label: true },
    });

    return Response.json(lossReasons);
  } catch (error) {
    console.error('[GET /api/loss-reasons] failed:', error);
    return Response.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
