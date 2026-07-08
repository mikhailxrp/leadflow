import type { Metadata } from 'next';
import { headers } from 'next/headers';
import CompanyActivityTable from '@/components/platform/CompanyActivityTable';
import { requirePlatformSession } from '@/lib/platform/auth';
import type { CompanyActivityItem } from '@/types/platform';

export const metadata: Metadata = {
  title: 'Активность компаний',
};

const DEFAULT_PERIOD_DAYS = 30 as const;

async function fetchActivity(
  period: number,
): Promise<CompanyActivityItem[]> {
  const headersList = await headers();
  const cookie = headersList.get('cookie') ?? '';
  const appUrl = process.env.APP_URL;

  if (!appUrl) {
    throw new Error('APP_URL is not configured');
  }

  const baseUrl = appUrl.replace(/\/$/, '');
  const response = await fetch(
    `${baseUrl}/api/platform/activity?period=${period}`,
    {
      headers: { cookie },
      cache: 'no-store',
    },
  );

  if (!response.ok) {
    throw new Error('Failed to fetch company activity');
  }

  return response.json() as Promise<CompanyActivityItem[]>;
}

export default async function PlatformActivityPage() {
  await requirePlatformSession();
  const activity = await fetchActivity(DEFAULT_PERIOD_DAYS);

  return (
    <CompanyActivityTable
      initialData={activity}
      initialPeriod={DEFAULT_PERIOD_DAYS}
    />
  );
}
