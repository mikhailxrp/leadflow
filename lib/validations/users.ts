import { z } from 'zod';

const userRoleSchema = z.enum(['MANAGER', 'HEAD', 'ADMIN']);

const emailSchema = z
  .string()
  .trim()
  .email()
  .transform((email) => email.toLowerCase());

export const createUserSchema = z.object({
  email: emailSchema,
  name: z.string().trim().min(1),
  password: z.string().min(8),
  role: userRoleSchema,
});

export const updateUserSchema = z
  .object({
    role: userRoleSchema.optional(),
    isBlocked: z.boolean().optional(),
  })
  .refine((data) => data.role !== undefined || data.isBlocked !== undefined, {
    message: 'At least one field is required',
  });

export const updateOwnProfileSchema = z
  .object({
    name: z.string().trim().min(1).max(100).optional(),
    phone: z.string().max(32).nullable().optional(),
    telegram: z.string().max(100).nullable().optional(),
    max: z.string().max(100).nullable().optional(),
    otherContact: z.string().max(200).nullable().optional(),
  })
  .strict();

export const changeOwnPasswordSchema = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(8),
  })
  .strict();

export const updateNotificationPreferencesSchema = z
  .object({
    assignedLead: z.boolean(),
    commentOnLead: z.boolean(),
    reminders: z.boolean(),
  })
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field is required',
  });

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type UpdateOwnProfileInput = z.infer<typeof updateOwnProfileSchema>;
export type ChangeOwnPasswordInput = z.infer<typeof changeOwnPasswordSchema>;
export type UpdateNotificationPreferencesInput = z.infer<
  typeof updateNotificationPreferencesSchema
>;
