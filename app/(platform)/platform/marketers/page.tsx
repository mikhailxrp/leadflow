import type { Metadata } from 'next';
import { headers } from 'next/headers';
import MarketersTable from '@/components/platform/MarketersTable';
import { requirePlatformSession } from '@/lib/platform/auth';
import type { MarketerActivityItem } from '@/types/platform';

export const metadata: Metadata = {
  title: 'Маркетологи',
};

async function fetchMarketers(): Promise<MarketerActivityItem[]> {
  const headersList = await headers();
  const cookie = headersList.get('cookie') ?? '';
  const appUrl = process.env.APP_URL;

  if (!appUrl) {
    throw new Error('APP_URL is not configured');
  }

  const baseUrl = appUrl.replace(/\/$/, '');
  const response = await fetch(`${baseUrl}/api/platform/marketers`, {
    headers: { cookie },
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error('Failed to fetch marketers');
  }

  return response.json() as Promise<MarketerActivityItem[]>;
}

export default async function PlatformMarketersPage() {
  await requirePlatformSession({ roles: ['SUPER_ADMIN'] });
  const marketers = await fetchMarketers();

  return <MarketersTable marketers={marketers} />;
}
