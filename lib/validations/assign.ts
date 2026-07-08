import { z } from 'zod';

export const assignSchema = z.object({
  managerId: z.string().min(1).nullable(),
});

export const createAssignmentRuleSchema = z.object({
  matchSource: z.string().trim().min(1).nullable(),
  matchSourceLabel: z.string().trim().min(1).nullable(),
  assignToId: z.string().min(1),
  fallbackToId: z.string().min(1).nullable(),
  priority: z.number().int(),
  isActive: z.boolean(),
});

export const updateAssignmentRuleSchema = z
  .object({
    matchSource: z.string().trim().min(1).nullable().optional(),
    matchSourceLabel: z.string().trim().min(1).nullable().optional(),
    assignToId: z.string().min(1).optional(),
    fallbackToId: z.string().min(1).nullable().optional(),
    priority: z.number().int().optional(),
    isActive: z.boolean().optional(),
  })
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: 'At least one field is required',
  });

export type AssignInput = z.infer<typeof assignSchema>;
export type CreateAssignmentRuleInput = z.infer<typeof createAssignmentRuleSchema>;
export type UpdateAssignmentRuleInput = z.infer<typeof updateAssignmentRuleSchema>;
