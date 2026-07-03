import { z } from 'zod';

export const updateSettingsSchema = z
  .object({
    assignMode: z.enum(['MANUAL', 'ROUND_ROBIN']).optional(),
  })
  .refine((data) => data.assignMode !== undefined, {
    message: 'At least one field is required',
  });

export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;
