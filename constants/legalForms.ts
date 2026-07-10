import type { CompanyLegalForm } from '@prisma/client';

export const LEGAL_FORM_LABELS: Record<CompanyLegalForm, string> = {
  IP: 'ИП',
  OOO: 'ООО',
  AO: 'АО',
  PAO: 'ПАО',
  NKO: 'НКО',
  SELF_EMPLOYED: 'Самозанятый',
  OTHER: 'Другое',
};

export const LEGAL_FORM_OPTIONS = Object.entries(LEGAL_FORM_LABELS).map(
  ([value, label]) => ({ value, label }),
);
