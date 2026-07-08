import { prisma } from '@/lib/prisma';

/**
 * Upserts an IntegrationSource health record by companyId_type_label composite key.
 * success → lastUsedAt updated, errorCount reset to 0
 * failed  → lastErrorAt updated, errorCount incremented
 * companyId must always be known at call site — never call this when companyId is uncertain.
 */
export async function touchIntegrationSource(
  companyId: string,
  type: string,
  label: string,
  failed: boolean,
): Promise<void> {
  const now = new Date();

  if (failed) {
    await prisma.integrationSource.upsert({
      where: { companyId_type_label: { companyId, type, label } },
      create: {
        companyId,
        type,
        label,
        lastErrorAt: now,
        errorCount: 1,
      },
      update: {
        lastErrorAt: now,
        errorCount: { increment: 1 },
      },
    });
  } else {
    await prisma.integrationSource.upsert({
      where: { companyId_type_label: { companyId, type, label } },
      create: {
        companyId,
        type,
        label,
        lastUsedAt: now,
        errorCount: 0,
      },
      update: {
        lastUsedAt: now,
        errorCount: 0,
      },
    });
  }
}
