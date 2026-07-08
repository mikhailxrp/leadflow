import { z } from 'zod';

export const boardQuerySchema = z.object({
  includeClosed: z.coerce.boolean().default(false),
  assignedToId: z.string().optional(),
});

export type BoardQueryInput = z.infer<typeof boardQuerySchema>;
