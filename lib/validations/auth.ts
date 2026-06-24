import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const acceptInviteSchema = z.object({
  token: z.string().min(1),
  name: z.string().min(1).max(100),
  password: z.string().min(8),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type AcceptInviteInput = z.infer<typeof acceptInviteSchema>;
