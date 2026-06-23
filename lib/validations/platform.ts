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

export const impersonateUserParamsSchema = z.object({
  companyId: z.string().min(1),
  userId: z.string().min(1),
});

export const endImpersonationBodySchema = z.object({}).strict();

export type PlatformLoginInput = z.infer<typeof loginSchema>;
export type CreateCompanyInput = z.infer<typeof createCompanySchema>;
export type BlockCompanyInput = z.infer<typeof blockCompanySchema>;
export type ImpersonateUserParamsInput = z.infer<
  typeof impersonateUserParamsSchema
>;
export type EndImpersonationBodyInput = z.infer<
  typeof endImpersonationBodySchema
>;
