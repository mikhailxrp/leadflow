import type { CompanyLegalForm } from '@prisma/client';

export type CompanyProfileDetail = {
  id: string;
  name: string;
  logoUrl: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  legalForm: CompanyLegalForm | null;
  directorName: string | null;
};
