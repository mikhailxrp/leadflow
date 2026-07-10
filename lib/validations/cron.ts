import { z } from 'zod';

export const cronAuthSchema = z
  .object({
    authorization: z.string().optional(),
    xCronSecret: z.string().optional(),
    key: z.string().optional(),
  })
  .strict();

export type CronAuthInput = z.infer<typeof cronAuthSchema>;
