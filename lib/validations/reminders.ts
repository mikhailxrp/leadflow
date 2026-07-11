import { z } from 'zod';

const MIN_LEAD_TIME_MS = 5 * 60 * 1000;

export const createReminderSchema = z.object({
  text: z.string().trim().min(1).max(1000),
  remindAt: z
    .string()
    .datetime()
    .refine(
      (value) => new Date(value).getTime() > Date.now() + MIN_LEAD_TIME_MS,
      'Дата должна быть в будущем (минимум 5 минут)',
    ),
  channels: z
    .array(z.enum(['telegram', 'email']))
    .min(1, 'Выберите хотя бы один канал'),
});

export const updateReminderSchema = createReminderSchema.partial();

export type CreateReminderInput = z.infer<typeof createReminderSchema>;
export type UpdateReminderInput = z.infer<typeof updateReminderSchema>;
