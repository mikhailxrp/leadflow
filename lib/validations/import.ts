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
