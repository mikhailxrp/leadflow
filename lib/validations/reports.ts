import { z } from 'zod';

export const reportPeriodSchema = z
  .object({
    from: z.string().datetime().optional(),
    to: z.string().datetime().optional(),
  })
  .refine((data) => !data.from || !data.to || data.from <= data.to, {
    message: 'from must be before or equal to to',
    path: ['from'],
  });

export type ReportPeriodInput = z.infer<typeof reportPeriodSchema>;

/**
 * from/to отсутствуют → дефолт: 1-е число текущего календарного месяца 00:00 UTC …
 * текущий момент. `to` сервером до конца дня не досчитывается — конвенция как в
 * /platform/logs: клиент сам шлёт уже скорректированный `T23:59:59.999Z` (см. таск 3 UI).
 */
export function resolveReportPeriod(input: ReportPeriodInput): { from: Date; to: Date } {
  const now = new Date();
  const monthStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0),
  );

  return {
    from: input.from ? new Date(input.from) : monthStart,
    to: input.to ? new Date(input.to) : now,
  };
}

export const reportExportNameSchema = z.enum([
  'summary',
  'loss-reasons',
  'by-employee',
  'by-source',
  'financial',
]);

export type ReportExportName = z.infer<typeof reportExportNameSchema>;
