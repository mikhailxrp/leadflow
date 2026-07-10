import { CompanyLegalForm } from '@prisma/client';
import { z } from 'zod';

export const updateCompanyProfileSchema = z
  .object({
    phone: z.string().trim().min(1).max(32),
    email: z.string().trim().email(),
    address: z.string().trim().max(300).nullable().optional(),
    legalForm: z.nativeEnum(CompanyLegalForm).nullable().optional(),
    directorName: z.string().trim().max(150).nullable().optional(),
  })
  .strict();

export type UpdateCompanyProfileInput = z.infer<typeof updateCompanyProfileSchema>;
