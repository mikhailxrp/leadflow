import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const createCompanySchema = z.object({
  name: z.string().min(1).max(100),
  adminEmail: z.string().email(),
});

export const blockCompanySchema = z.object({
  isBlocked: z.boolean(),
});

export type PlatformLoginInput = z.infer<typeof loginSchema>;
export type CreateCompanyInput = z.infer<typeof createCompanySchema>;
export type BlockCompanyInput = z.infer<typeof blockCompanySchema>;
