import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const createCompanySchema = z.object({
  name: z.string().min(1).max(100),
  adminEmail: z.string().email(),
});

export const blockCompanySchema = z
  .object({
    isBlocked: z.boolean(),
  })
  .strict();

export const setCompanyPaymentSchema = z
  .object({
    nextPaymentAt: z.union([z.string().date(), z.null()]),
  })
  .strict();

export const patchCompanySchema = z.union([
  blockCompanySchema,
  setCompanyPaymentSchema,
]);

export const impersonateUserParamsSchema = z.object({
  companyId: z.string().min(1),
  userId: z.string().min(1),
});

export const endImpersonationBodySchema = z.object({}).strict();

export const createPlatformAdminSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
  password: z.string().min(8),
});

export const platformAdminParamsSchema = z.object({
  id: z.string().min(1),
});

export const createMarketerSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
  password: z.string().min(8),
});

export const updateMarketerSchema = z
  .object({
    isActive: z.boolean(),
  })
  .strict();

export const marketerParamsSchema = z.object({
  id: z.string().min(1),
});

export const createGrantSchema = z
  .object({
    marketerId: z.string().min(1),
  })
  .strict();

export const companyGrantParamsSchema = z.object({
  companyId: z.string().min(1),
  marketerId: z.string().min(1),
});

export const marketerAccessParamsSchema = z.object({
  companyId: z.string().min(1),
});

export const endMarketerAccessBodySchema = z.object({}).strict();

export const activityPeriodSchema = z.coerce
  .number()
  .int()
  .refine((value) => value === 7 || value === 30 || value === 90, {
    message: 'period must be 7, 30, or 90',
  });

export const platformForgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const platformResetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8),
});

export const cronSubscriptionAuthSchema = z
  .object({
    authorization: z.string().optional(),
    xCronSecret: z.string().optional(),
    key: z.string().optional(),
  })
  .strict();

export type PlatformLoginInput = z.infer<typeof loginSchema>;
export type CreateCompanyInput = z.infer<typeof createCompanySchema>;
export type BlockCompanyInput = z.infer<typeof blockCompanySchema>;
export type SetCompanyPaymentInput = z.infer<typeof setCompanyPaymentSchema>;
export type PatchCompanyInput = z.infer<typeof patchCompanySchema>;
export type ImpersonateUserParamsInput = z.infer<
  typeof impersonateUserParamsSchema
>;
export type EndImpersonationBodyInput = z.infer<
  typeof endImpersonationBodySchema
>;
export type CreatePlatformAdminInput = z.infer<typeof createPlatformAdminSchema>;
export type PlatformAdminParamsInput = z.infer<typeof platformAdminParamsSchema>;
export type CreateMarketerInput = z.infer<typeof createMarketerSchema>;
export type UpdateMarketerInput = z.infer<typeof updateMarketerSchema>;
export type MarketerParamsInput = z.infer<typeof marketerParamsSchema>;
export type CreateGrantInput = z.infer<typeof createGrantSchema>;
export type CompanyGrantParamsInput = z.infer<typeof companyGrantParamsSchema>;
export type MarketerAccessParamsInput = z.infer<
  typeof marketerAccessParamsSchema
>;
export type EndMarketerAccessBodyInput = z.infer<
  typeof endMarketerAccessBodySchema
>;
export type PlatformForgotPasswordInput = z.infer<
  typeof platformForgotPasswordSchema
>;
export type PlatformResetPasswordInput = z.infer<
  typeof platformResetPasswordSchema
>;
export type CronSubscriptionAuthInput = z.infer<
  typeof cronSubscriptionAuthSchema
>;
