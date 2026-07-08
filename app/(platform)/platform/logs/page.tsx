import type { Metadata } from 'next';
import { headers } from 'next/headers';
import PlatformLogsClient from '@/components/platform/PlatformLogsClient';
import { requirePlatformSession } from '@/lib/platform/auth';
import type { PlatformCompanyListItem } from '@/types/platform';

export const metadata: Metadata = {
  title: 'Логи',
};

export type PlatformLogsCompanyOption = { id: string; name: string };

async function fetchVisibleCompanies(): Promise<PlatformLogsCompanyOption[]> {
  const headersList = await headers();
  const cookie = headersList.get('cookie') ?? '';
  const appUrl = process.env.APP_URL;

  if (!appUrl) {
    throw new Error('APP_URL is not configured');
  }

  const baseUrl = appUrl.replace(/\/$/, '');
  const response = await fetch(`${baseUrl}/api/platform/companies`, {
    headers: { cookie },
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error('Failed to fetch companies');
  }

  const companies = (await response.json()) as PlatformCompanyListItem[];

  return companies
    .filter((company): company is PlatformCompanyListItem & { id: string } =>
      Boolean(company.id),
    )
    .map((company) => ({ id: company.id, name: company.name }));
}

export default async function PlatformLogsPage() {
  const session = await requirePlatformSession({
    roles: ['SUPER_ADMIN', 'MARKETER'],
  });
  const companies = await fetchVisibleCompanies();

  return <PlatformLogsClient companies={companies} role={session.admin.role} />;
}
