import { requireCompanyUser } from '@/lib/auth/requireCompanyAccess';
import { prisma } from '@/lib/prisma';

export async function POST(): Promise<Response> {
  let actor;
  try {
    actor = await requireCompanyUser({ minRole: 'MANAGER' });
  } catch (error) {
    if (error instanceof Response) return error;
    throw error;
  }

  const { userId, companyId } = actor;

  await prisma.notification.updateMany({
    where: { userId, companyId, readAt: null },
    data: { readAt: new Date() },
  });

  return Response.json({ ok: true });
}
