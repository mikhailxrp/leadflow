import { z } from 'zod';

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

const overrideMapSchema = z.record(
  z.string(),
  z.number().int().positive().nullable(),
);

const reactionNormsSchema = z
  .object({
    defaultMinutes: z.number().int().positive(),
    reminderBeforePercent: z.number().int().min(1).max(100),
    escalateAfterPercent: z.number().int().min(100),
    workHoursOnly: z.boolean(),
    bySource: overrideMapSchema,
    byStage: overrideMapSchema,
    byUser: overrideMapSchema,
  })
  .partial();

const workHoursSchema = z.object({
  start: z.string().regex(TIME_REGEX, 'Ожидается формат HH:MM'),
  end: z.string().regex(TIME_REGEX, 'Ожидается формат HH:MM'),
  days: z.array(z.number().int().min(1).max(7)).min(1),
});

export const updateSettingsSchema = z
  .object({
    assignMode: z.enum(['MANUAL', 'ROUND_ROBIN']).optional(),
    telegramEnabled: z.boolean().optional(),
    controlEnabled: z.boolean().optional(),
    reactionNorms: reactionNormsSchema.optional(),
    workHours: workHoursSchema.optional(),
    stageStuckDaysDefault: z.number().int().positive().optional(),
    stuckCheckTime: z.string().regex(TIME_REGEX, 'Ожидается формат HH:MM').optional(),
    sourceHealthThresholdHours: z.number().int().positive().optional(),
  })
  .refine(
    (data) => Object.values(data).some((value) => value !== undefined),
    { message: 'At least one field is required' },
  );

export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;
