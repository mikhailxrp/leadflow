import { z } from 'zod';

export const controlPeriodSchema = z.coerce
  .number()
  .int()
  .refine((value) => value === 7 || value === 30 || value === 90, {
    message: 'period must be 7, 30, or 90',
  });
