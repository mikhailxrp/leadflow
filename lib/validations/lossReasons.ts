import { z } from 'zod';

export const LOSS_REASON_LABEL_MAX_LENGTH = 200;

const lossReasonLabelSchema = z
  .string()
  .trim()
  .min(1)
  .max(LOSS_REASON_LABEL_MAX_LENGTH);

export const createLossReasonSchema = z.object({
  label: lossReasonLabelSchema,
});

export const updateLossReasonSchema = z.object({
  label: lossReasonLabelSchema,
});

export const reorderLossReasonsSchema = z.object({
  orderedIds: z.array(z.string().min(1)).min(1),
});

export type CreateLossReasonInput = z.infer<typeof createLossReasonSchema>;
export type UpdateLossReasonInput = z.infer<typeof updateLossReasonSchema>;
export type ReorderLossReasonsInput = z.infer<typeof reorderLossReasonsSchema>;
