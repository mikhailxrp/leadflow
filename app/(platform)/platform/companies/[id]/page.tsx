import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import CompanyDetailPageClient from '@/components/platform/CompanyDetailPageClient';
import { requirePlatformSession } from '@/lib/platform/auth';
import {
  canManageCompany,
  isPlatformCompany,
  resolveOwnerRoles,
  visibilityWhere,
  type PlatformAdminIdentity,
} from '@/lib/platform/companyVisibility';
import { getSubscriptionStatus } from '@/lib/platform/subscription';
import { prisma } from '@/lib/prisma';
import type { PlatformCompanyDetail } from '@/types/platform';

interface CompanyDetailPageProps {
  params: Promise<{ id: string }>;
}

async function loadCompanyDetail(
  companyId: string,
  admin: PlatformAdminIdentity,
): Promise<PlatformCompanyDetail | null> {
  const [company, lastLoginAggregate, pendingInvite] = await Promise.all([
    prisma.company.findFirst({
      where: { id: companyId, ...visibilityWhere(admin) },
      select: {
        id: true,
        name: true,
        isBlocked: true,
        nextPaymentAt: true,
        createdAt: true,
        createdByPlatformAdminId: true,
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

  const ownerRoles = await resolveOwnerRoles([company.createdByPlatformAdminId]);
  const ownerRole = company.createdByPlatformAdminId
    ? ownerRoles.get(company.createdByPlatformAdminId)
    : undefined;

  const subscriptionStatus = getSubscriptionStatus(company.nextPaymentAt);
  const isPlatform = isPlatformCompany(company, ownerRole);

  let grants: PlatformCompanyDetail['grants'];
  let availableMarketers: PlatformCompanyDetail['availableMarketers'];

  if (admin.role === 'SUPER_ADMIN' && isPlatform) {
    const grantRows = await prisma.companyAccessGrant.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
      select: { platformAdminId: true },
    });
    const grantedMarketerIds = grantRows.map((row) => row.platformAdminId);

    const [grantedMarketers, activeMarketers] = await Promise.all([
      grantedMarketerIds.length > 0
        ? prisma.platformAdmin.findMany({
            where: { id: { in: grantedMarketerIds } },
            select: { id: true, name: true, email: true },
          })
        : Promise.resolve([]),
      prisma.platformAdmin.findMany({
        where: {
          role: 'MARKETER',
          isActive: true,
          deletedAt: null,
          id: { notIn: grantedMarketerIds },
        },
        select: { id: true, name: true, email: true },
      }),
    ]);
    const grantedMarketerById = new Map(
      grantedMarketers.map((marketer) => [marketer.id, marketer]),
    );

    grants = grantedMarketerIds
      .map((id) => grantedMarketerById.get(id))
      .filter((marketer): marketer is (typeof grantedMarketers)[number] => marketer !== undefined)
      .map((marketer) => ({
        marketerId: marketer.id,
        name: marketer.name,
        email: marketer.email,
      }));
    availableMarketers = activeMarketers;
  }

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
    manageable: canManageCompany(admin, company, ownerRole),
    ownedByMarketer: !isPlatform,
    grants,
    availableMarketers,
  };
}

export async function generateMetadata({
  params,
}: CompanyDetailPageProps): Promise<Metadata> {
  const session = await requirePlatformSession({
    roles: ['SUPER_ADMIN', 'MARKETER'],
  });
  const { id } = await params;
  const company = await prisma.company.findFirst({
    where: { id, ...visibilityWhere(session.admin) },
    select: { name: true },
  });

  return {
    title: company?.name ?? 'Компания',
  };
}

export default async function CompanyDetailPage({
  params,
}: CompanyDetailPageProps) {
  const session = await requirePlatformSession({
    roles: ['SUPER_ADMIN', 'MARKETER'],
  });
  const { id } = await params;
  const company = await loadCompanyDetail(id, session.admin);

  if (!company) {
    notFound();
  }

  return (
    <CompanyDetailPageClient company={company} viewerRole={session.admin.role} />
  );
}
