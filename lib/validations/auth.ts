import { z } from 'zod';

export const acceptInviteSchema = z.object({
  token: z.string().min(1),
  name: z.string().min(1).max(100),
  password: z.string().min(8),
});

export type AcceptInviteInput = z.infer<typeof acceptInviteSchema>;
