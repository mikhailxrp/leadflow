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

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
