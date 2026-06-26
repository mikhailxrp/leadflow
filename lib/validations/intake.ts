import { z } from 'zod';

/**
 * Soft validation schema for a normalized lead.
 * All standard fields are optional/nullable — an intake must never be rejected
 * because a field is missing or unrecognised. passthrough() ensures unknown
 * keys are preserved rather than stripped or rejected.
 */
export const intakeLeadSchema = z
  .object({
    name: z.string().nullable().optional(),
    phone: z.string().nullable().optional(),
    email: z.string().nullable().optional(),
    comment: z.string().nullable().optional(),
    source: z.string(),
    utm: z.record(z.unknown()).default({}),
    marketing: z.record(z.unknown()).default({}),
    customFields: z.record(z.unknown()).default({}),
  })
  .passthrough();

export type IntakeLead = z.infer<typeof intakeLeadSchema>;
