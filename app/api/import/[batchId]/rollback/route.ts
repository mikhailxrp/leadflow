import { requireCompanyUser } from '@/lib/auth/requireCompanyAccess';
import { prisma } from '@/lib/prisma';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ batchId: string }> },
): Promise<Response> {
  let actor;
  try {
    actor = await requireCompanyUser({ minRole: 'ADMIN' });
  } catch (error) {
    if (error instanceof Response) return error;
    throw error;
  }

  const { batchId } = await params;
  const { companyId, userId, impersonatedByPlatformAdminId } = actor;

  try {
    const batch = await prisma.importBatch.findFirst({
      where: { id: batchId, companyId },
      select: { id: true, status: true, imported: true },
    });

    if (!batch) {
      return Response.json({ error: 'Not found' }, { status: 404 });
    }

    if (batch.status !== 'DONE') {
      return Response.json({ error: 'IMPORT_NOT_ROLLBACKABLE' }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.lead.deleteMany({ where: { importBatchId: batchId, companyId } });
      await tx.importBatch.update({ where: { id: batchId }, data: { status: 'ROLLED_BACK' } });
      await tx.event.create({
        data: {
          companyId,
          userId,
          type: 'IMPORT_ROLLED_BACK',
          payload: { batchId, deleted: batch.imported },
          impersonatedByPlatformAdminId: impersonatedByPlatformAdminId ?? null,
        },
      });
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error('[POST /api/import/:batchId/rollback] failed:', error);
    return Response.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
