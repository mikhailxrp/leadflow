import { z } from 'zod';

export const createApiKeySchema = z.object({
  name: z.string().trim().min(1),
  sourceLabel: z.string().trim().min(1),
});

export type CreateApiKeyInput = z.infer<typeof createApiKeySchema>;
