import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import CompanyDetailPageClient from '@/components/platform/CompanyDetailPageClient';
import { requirePlatformSession } from '@/lib/platform/auth';
import { getSubscriptionStatus } from '@/lib/platform/subscription';
import { prisma } from '@/lib/prisma';
import type { PlatformCompanyDetail } from '@/types/platform';

interface CompanyDetailPageProps {
  params: Promise<{ id: string }>;
}

async function loadCompanyDetail(
  companyId: string,
): Promise<PlatformCompanyDetail | null> {
  const [company, lastLoginAggregate, pendingInvite] = await Promise.all([
    prisma.company.findUnique({
      where: { id: companyId },
      select: {
        id: true,
        name: true,
        isBlocked: true,
        nextPaymentAt: true,
        createdAt: true,
        _count: { select: { leads: true } },
        users: {
          orderBy: [{ role: 'desc' }, { name: 'asc' }],
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            isBlocked: true,
            lastLoginAt: true,
          },
        },
      },
    }),
    prisma.user.aggregate({
      where: { companyId },
      _max: { lastLoginAt: true },
    }),
    prisma.companyInvite.findFirst({
      where: {
        companyId,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      select: { email: true },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  if (!company) {
    return null;
  }

  const subscriptionStatus = getSubscriptionStatus(company.nextPaymentAt);

  return {
    id: company.id,
    name: company.name,
    isBlocked: company.isBlocked,
    createdAt: company.createdAt.toISOString(),
    leadCount: company._count.leads,
    lastLoginAt: lastLoginAggregate._max.lastLoginAt?.toISOString() ?? null,
    nextPaymentAt: company.nextPaymentAt?.toISOString() ?? null,
    subscriptionStatus: subscriptionStatus.status,
    users: company.users.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      isBlocked: user.isBlocked,
      lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
    })),
    pendingInviteEmail: pendingInvite?.email ?? null,
  };
}

export async function generateMetadata({
  params,
}: CompanyDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const company = await prisma.company.findUnique({
    where: { id },
    select: { name: true },
  });

  return {
    title: company?.name ?? 'Компания',
  };
}

export default async function CompanyDetailPage({
  params,
}: CompanyDetailPageProps) {
  await requirePlatformSession();
  const { id } = await params;
  const company = await loadCompanyDetail(id);

  if (!company) {
    notFound();
  }

  return <CompanyDetailPageClient company={company} />;
}
