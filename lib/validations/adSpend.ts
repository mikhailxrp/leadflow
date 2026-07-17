import { z } from 'zod';
import { MAX_DEAL_VALUE } from '@/lib/validations/leads';

export const adSpendSchema = z.object({
  year: z.number().int().min(2020).max(2100),
  month: z.number().int().min(1).max(12),
  amountWithVat: z.number().nonnegative().max(MAX_DEAL_VALUE),
  // Ключ обязателен (не .optional()) — форма всегда шлёт полную запись, поэтому
  // note: null — явная очистка заметки, а не «оставить как было».
  note: z.string().trim().max(500).nullable(),
});

export const adSpendQuerySchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

export type AdSpendInput = z.infer<typeof adSpendSchema>;
export type AdSpendQueryInput = z.infer<typeof adSpendQuerySchema>;
