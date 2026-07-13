import type { Prisma } from '@prisma/client';
import { writeEvent } from '@/lib/events';
import { findPossibleDuplicates } from '@/lib/intake/findPossibleDuplicates';
import { isMappedRowEmpty, mapRow } from '@/lib/import/mapRow';
import { prisma } from '@/lib/prisma';
import type { ImportColumnMapping, ImportReport, ParsedRow } from '@/types/import';

/**
 * Batch-creates leads from already-mapped import rows.
 *
 * Deliberately does NOT reuse lib/intake/createLead.ts — that function hardcodes
 * assignedToId: null and has no importBatchId parameter, so rollback (which
 * deletes by importBatchId) would silently find nothing to delete. It also runs
 * normalizeLead(), which would re-interpret already-mapped keys.
 *
 * Rows are processed strictly sequentially (not Promise.all): each row's
 * duplicate check must see leads committed by earlier rows of the same file
 * (see .docs/phases/phase-20.md decision 4 — intra-file duplicates).
 *
 * errors = row is fully empty after mapping (same rule as the preview's
 * isMappedRowEmpty, so the count matches what the user already saw).
 * skipped = defensive catch — an otherwise non-empty row failed to create
 * (unexpected), so one bad row doesn't abort the whole batch.
 */
export async function runImport(
  companyId: string,
  userId: string,
  impersonatedByPlatformAdminId: string | null,
  fileName: string,
  mapping: ImportColumnMapping,
  rows: ParsedRow[],
): Promise<ImportReport> {
  const stage = await prisma.pipelineStage.findFirst({
    where: { companyId },
    orderBy: { order: 'asc' },
    select: { id: true },
  });

  if (!stage) {
    throw new Error(`No pipeline stages found for company ${companyId}`);
  }

  const batch = await prisma.importBatch.create({
    data: {
      companyId,
      createdById: userId,
      fileName,
      totalRows: rows.length,
    },
  });

  let imported = 0;
  let skipped = 0;
  let duplicates = 0;
  let errors = 0;

  for (const row of rows) {
    const fields = mapRow(row, mapping);

    if (isMappedRowEmpty(fields)) {
      errors += 1;
      continue;
    }

    try {
      const matches = await findPossibleDuplicates(companyId, fields.phone, fields.email);

      await prisma.$transaction(async (tx) => {
        const lead = await tx.lead.create({
          data: {
            companyId,
            source: 'import',
            stageId: stage.id,
            assignedToId: null,
            importBatchId: batch.id,
            name: fields.name,
            phone: fields.phone,
            email: fields.email,
            comment: fields.comment,
            customFields: fields.customFields as Prisma.InputJsonValue,
          },
        });

        await tx.event.create({
          data: {
            companyId,
            leadId: lead.id,
            userId,
            type: 'LEAD_CREATED',
            payload: { source: 'import' },
            impersonatedByPlatformAdminId,
          },
        });

        for (const match of matches) {
          await tx.duplicateFlag.create({
            data: {
              companyId,
              leadId: lead.id,
              matchedLeadId: match.id,
              matchType: match.matchType,
            },
          });

          await tx.event.create({
            data: {
              companyId,
              leadId: lead.id,
              userId,
              type: 'DUPLICATE_FLAGGED',
              payload: { matchedLeadId: match.id, matchType: match.matchType },
              impersonatedByPlatformAdminId,
            },
          });
        }
      });

      imported += 1;
      if (matches.length > 0) duplicates += 1;
    } catch (error) {
      console.error('[runImport] row failed:', error);
      skipped += 1;
    }
  }

  await prisma.importBatch.update({
    where: { id: batch.id },
    data: { status: 'DONE', imported, skipped, duplicates, errors },
  });

  await writeEvent(companyId, 'IMPORT_COMPLETED', {
    payload: { batchId: batch.id, totalRows: rows.length, imported, skipped, duplicates, errors },
  });

  return {
    batchId: batch.id,
    totalRows: rows.length,
    imported,
    skipped,
    duplicates,
    errors,
  };
}
