import { z } from 'zod';

export const createApiKeySchema = z.object({
  name: z.string().trim().min(1),
  sourceLabel: z.string().trim().min(1),
});

export const updateApiKeySchema = z.object({
  isEnabled: z.boolean(),
});

export type CreateApiKeyInput = z.infer<typeof createApiKeySchema>;
export type UpdateApiKeyInput = z.infer<typeof updateApiKeySchema>;
