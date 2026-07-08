import type { Metadata } from 'next';
import { headers } from 'next/headers';
import CompaniesPageClient from '@/components/platform/CompaniesPageClient';
import { requirePlatformSession } from '@/lib/platform/auth';
import type { PlatformCompanyListItem } from '@/types/platform';

export const metadata: Metadata = {
  title: 'Компании',
};

async function fetchCompanies(): Promise<PlatformCompanyListItem[]> {
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

  return response.json() as Promise<PlatformCompanyListItem[]>;
}

export default async function PlatformCompaniesPage() {
  await requirePlatformSession();
  const companies = await fetchCompanies();

  return <CompaniesPageClient companies={companies} />;
}
