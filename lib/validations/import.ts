import { z } from 'zod';
import { MAX_IMPORT_ROWS } from '@/lib/import/parseFile';
import type { MappingTarget } from '@/types/import';

export const mappingTargetSchema = z
  .union([
    z.literal('name'),
    z.literal('phone'),
    z.literal('email'),
    z.literal('comment'),
    z.literal('skip'),
    z.string().regex(/^customField:.+/),
  ])
  .transform((value): MappingTarget => value as MappingTarget);

/**
 * Second (JSON) call to POST /api/import/preview.
 *
 * `rows` is capped independently here — this is a separate HTTP request from
 * the multipart parse call and does not share state with it, so the 5000-row
 * limit must be re-validated, not assumed already enforced.
 */
export const previewRemapSchema = z.object({
  mapping: z.record(mappingTargetSchema),
  rows: z.array(z.record(z.unknown())).max(MAX_IMPORT_ROWS),
});

export type PreviewRemapInput = z.infer<typeof previewRemapSchema>;

/**
 * POST /api/import/confirm.
 *
 * `fileName` is not part of the example request in import.md, but
 * ImportBatch.fileName is a required non-null column — the client carries the
 * original File.name forward from the upload step (Task 1) into this call.
 * `confirmDuplicates` from the module's example is intentionally omitted: the
 * server never branches on it (duplicates never block creation anywhere in
 * the product) — it is a client-only confirmation checkbox (Task 3).
 */
export const confirmImportSchema = z.object({
  fileName: z.string().min(1).max(255),
  mapping: z.record(mappingTargetSchema),
  rows: z.array(z.record(z.unknown())).max(MAX_IMPORT_ROWS),
});

export type ConfirmImportInput = z.infer<typeof confirmImportSchema>;
