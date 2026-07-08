import { hasMinRole } from '@/constants/roles';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { reorderLossReasonsSchema } from '@/lib/validations/lossReasons';

function isSameIdSet(existingIds: Set<string>, orderedIds: string[]): boolean {
  if (existingIds.size !== orderedIds.length) {
    return false;
  }

  if (new Set(orderedIds).size !== orderedIds.length) {
    return false;
  }

  return orderedIds.every((id) => existingIds.has(id));
}

export async function PATCH(request: Request): Promise<Response> {
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

  const parsed = reorderLossReasonsSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: 'VALIDATION_ERROR' }, { status: 400 });
  }

  const { orderedIds } = parsed.data;

  try {
    const existing = await prisma.lossReason.findMany({
      where: { companyId },
      select: { id: true },
    });

    const existingIds = new Set(existing.map((reason) => reason.id));

    if (!isSameIdSet(existingIds, orderedIds)) {
      return Response.json({ error: 'VALIDATION_ERROR' }, { status: 400 });
    }

    await prisma.$transaction(
      orderedIds.map((id, index) =>
        prisma.lossReason.update({
          where: { id, companyId },
          data: { order: index },
        }),
      ),
    );

    const reordered = await prisma.lossReason.findMany({
      where: { companyId },
      orderBy: { order: 'asc' },
      select: { id: true, label: true, order: true },
    });

    return Response.json(reordered);
  } catch (error) {
    console.error('[PATCH /api/loss-reasons/reorder] failed:', error);
    return Response.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
