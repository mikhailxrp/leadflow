import { requireCompanyUser } from '@/lib/auth/requireCompanyAccess';
import { prisma } from '@/lib/prisma';
import type { ImportHistoryItem } from '@/types/import';

export async function GET(): Promise<Response> {
  let actor;
  try {
    actor = await requireCompanyUser({ minRole: 'ADMIN' });
  } catch (error) {
    if (error instanceof Response) return error;
    throw error;
  }

  const batches = await prisma.importBatch.findMany({
    where: { companyId: actor.companyId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      fileName: true,
      status: true,
      totalRows: true,
      imported: true,
      skipped: true,
      duplicates: true,
      errors: true,
      createdAt: true,
      createdBy: { select: { name: true } },
    },
  });

  const result: ImportHistoryItem[] = batches.map((batch) => ({
    id: batch.id,
    fileName: batch.fileName,
    status: batch.status,
    totalRows: batch.totalRows,
    imported: batch.imported,
    skipped: batch.skipped,
    duplicates: batch.duplicates,
    errors: batch.errors,
    createdAt: batch.createdAt.toISOString(),
    createdByName: batch.createdBy.name,
  }));

  return Response.json(result);
}
