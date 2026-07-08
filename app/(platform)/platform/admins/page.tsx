import type { Metadata } from 'next';
import { headers } from 'next/headers';
import PlatformAdminsTable from '@/components/platform/PlatformAdminsTable';
import { requirePlatformSession } from '@/lib/platform/auth';
import type { PlatformAdminListItem } from '@/types/platform';

export const metadata: Metadata = {
  title: 'Администраторы платформы',
};

async function fetchAdmins(): Promise<PlatformAdminListItem[]> {
  const headersList = await headers();
  const cookie = headersList.get('cookie') ?? '';
  const appUrl = process.env.APP_URL;

  if (!appUrl) {
    throw new Error('APP_URL is not configured');
  }

  const baseUrl = appUrl.replace(/\/$/, '');
  const response = await fetch(`${baseUrl}/api/platform/admins`, {
    headers: { cookie },
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error('Failed to fetch platform admins');
  }

  return response.json() as Promise<PlatformAdminListItem[]>;
}

export default async function PlatformAdminsPage() {
  const session = await requirePlatformSession({ roles: ['SUPER_ADMIN'] });
  const admins = await fetchAdmins();

  return <PlatformAdminsTable admins={admins} currentAdminId={session.admin.id} />;
}
