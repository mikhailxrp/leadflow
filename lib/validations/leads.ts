import { z } from 'zod';

/**
 * Manual lead creation — name is required; phone/email are optional without format checks
 * (lead must never be lost due to validation).
 */
export const createLeadSchema = z
  .object({
    name: z.string().trim().min(1, 'Name is required'),
    phone: z.string().optional(),
    email: z.string().optional(),
    confirmDuplicate: z.boolean().optional(),
  })
  .passthrough();

export type CreateLeadInput = z.infer<typeof createLeadSchema>;
