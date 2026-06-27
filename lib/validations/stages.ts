import { z } from 'zod';

export const STAGE_NAME_MAX_LENGTH = 100;

export const stageNameSchema = z
  .string()
  .trim()
  .min(1)
  .max(STAGE_NAME_MAX_LENGTH);

export const stageColorSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/);

export const createStageSchema = z.object({
  name: stageNameSchema,
  color: stageColorSchema,
  stageTimeLimitDays: z.number().int().positive().optional(),
});

export const updateStageSchema = z.object({
  name: stageNameSchema.optional(),
  color: stageColorSchema.optional(),
  stageTimeLimitDays: z.number().int().positive().nullable().optional(),
});

export const reorderStagesSchema = z.object({
  orderedIds: z.array(z.string().min(1)).min(1),
});

export const deleteStageSchema = z.object({
  moveToStageId: z.string().min(1).optional(),
});

export type CreateStageInput = z.infer<typeof createStageSchema>;
export type UpdateStageInput = z.infer<typeof updateStageSchema>;
export type ReorderStagesInput = z.infer<typeof reorderStagesSchema>;
export type DeleteStageInput = z.infer<typeof deleteStageSchema>;
