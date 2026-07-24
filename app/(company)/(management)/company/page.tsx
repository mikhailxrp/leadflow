import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import CompanyProfileForm from '@/components/company/CompanyProfileForm';
import { PageContent } from '@/components/layout/AppLayout';
import MobileMenuButton from '@/components/layout/MobileMenuButton';
import NotificationBell from '@/components/notifications/NotificationBell';
import { hasMinRole } from '@/constants/roles';
import { COMPANY_PROFILE_SELECT, toCompanyProfileDetail } from '@/lib/company/profile';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const metadata: Metadata = {
  title: 'Компания',
};

export default async function CompanyPage() {
  const session = await auth();
  if (!session || session.kind !== 'company' || !session.user) {
    redirect('/login');
  }

  if (!hasMinRole(session.user.role, 'HEAD')) {
    redirect('/today');
  }

  const company = await prisma.company.findUniqueOrThrow({
    where: { id: session.user.companyId },
    select: COMPANY_PROFILE_SELECT,
  });

  return (
    <>
      <header
        className="
          sticky top-0 z-30 flex h-[56px] flex-shrink-0 items-center
          border-b-[0.5px] border-[var(--color-border)]
          bg-[var(--color-bg-surface)] px-4 sm:px-6
        "
      >
        <MobileMenuButton />
        <div className="ml-auto flex items-center gap-3">
          <NotificationBell />
        </div>
      </header>

      <PageContent>
        <CompanyProfileForm company={toCompanyProfileDetail(company)} />
      </PageContent>
    </>
  );
}
