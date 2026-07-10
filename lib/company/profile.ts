import type { Prisma } from '@prisma/client';
import type { CompanyProfileDetail } from '@/types/company';

export const COMPANY_PROFILE_SELECT = {
  id: true,
  name: true,
  logoUrl: true,
  phone: true,
  email: true,
  address: true,
  legalForm: true,
  directorName: true,
} as const;

type CompanyProfileRow = Prisma.CompanyGetPayload<{
  select: typeof COMPANY_PROFILE_SELECT;
}>;

export function toCompanyProfileDetail(company: CompanyProfileRow): CompanyProfileDetail {
  return {
    id: company.id,
    name: company.name,
    logoUrl: company.logoUrl,
    phone: company.phone,
    email: company.email,
    address: company.address,
    legalForm: company.legalForm,
    directorName: company.directorName,
  };
}
