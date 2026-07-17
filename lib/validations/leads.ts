import { z } from 'zod';
import {
  DEFAULT_LEADS_PAGE_SIZE,
  MAX_LEADS_PAGE_SIZE,
} from '@/constants/leads';

const leadStatusFilterSchema = z.enum(['open', 'won', 'lost']);
const leadPeriodFilterSchema = z.enum(['today', 'week', 'month']);

/**
 * Manual lead creation — name is required; phone/email are optional without format checks
 * (lead must never be lost due to validation).
 */
export const createLeadSchema = z
  .object({
    name: z.string().trim().min(1, 'Name is required'),
    phone: z.string().optional(),
    email: z.string().optional(),
    confirmDuplicate: z.boolean().optional(),
  })
  .passthrough();

export const leadsQuerySchema = z.object({
  search: z.string().default(''),
  source: z.string().default(''),
  assignedToId: z.string().default(''),
  status: z
    .union([z.literal(''), leadStatusFilterSchema])
    .default(''),
  period: z
    .union([z.literal(''), leadPeriodFilterSchema])
    .default(''),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce
    .number()
    .int()
    .positive()
    .max(MAX_LEADS_PAGE_SIZE)
    .default(DEFAULT_LEADS_PAGE_SIZE),
});

/**
 * Lead card PATCH — contact fields only; no intake fields (source, utm, customFields).
 * No .passthrough() — unknown keys must not reach Prisma update data.
 */
export const updateLeadSchema = z.object({
  name: z.string().trim().min(1).optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  comment: z.string().optional(),
});

// Decimal(14, 2) — до 12 знаков в целой части.
const MAX_DEAL_VALUE = 999_999_999_999.99;

export const closeLeadSchema = z.discriminatedUnion('closeType', [
  z.object({
    closeType: z.literal('WON'),
    dealValueFinal: z.number().positive().max(MAX_DEAL_VALUE),
  }),
  z.object({ closeType: z.literal('LOST'), lossReasonId: z.string().min(1) }),
]);

export const dealValueSchema = z.object({
  dealValueEstimated: z.number().nonnegative().max(MAX_DEAL_VALUE).nullable(),
});

export const commentSchema = z.object({
  text: z.string().trim().min(1).max(5000),
});

export const changeStageSchema = z.object({
  stageId: z.string().min(1),
});

export const qualificationSchema = z.object({
  qualification: z.enum(['QUALIFIED', 'DISQUALIFIED']).nullable(),
});

export type CreateLeadInput = z.infer<typeof createLeadSchema>;
export type LeadsQueryInput = z.infer<typeof leadsQuerySchema>;
export type UpdateLeadInput = z.infer<typeof updateLeadSchema>;
export type CloseLeadInput = z.infer<typeof closeLeadSchema>;
export type CommentInput = z.infer<typeof commentSchema>;
export type ChangeStageInput = z.infer<typeof changeStageSchema>;
export type QualificationInput = z.infer<typeof qualificationSchema>;
export type DealValueInput = z.infer<typeof dealValueSchema>;
