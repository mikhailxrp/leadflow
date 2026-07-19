import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import MarketerDetailPageClient from '@/components/platform/MarketerDetailPageClient';
import { requirePlatformSession } from '@/lib/platform/auth';
import { prisma } from '@/lib/prisma';
import type { MarketerDetail } from '@/types/platform';

interface MarketerDetailPageProps {
  params: Promise<{ id: string }>;
}

async function loadMarketerDetail(id: string): Promise<MarketerDetail | null> {
  const marketer = await prisma.platformAdmin.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      avatarUrl: true,
      telegram: true,
      vk: true,
      max: true,
      role: true,
      isActive: true,
      passwordHash: true,
      lastLoginAt: true,
      createdAt: true,
      deletedAt: true,
    },
  });

  if (!marketer || marketer.role !== 'MARKETER' || marketer.deletedAt) {
    return null;
  }

  const [ownedCompanies, grants] = await Promise.all([
    prisma.company.findMany({
      where: { createdByPlatformAdminId: id },
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, createdAt: true, isBlocked: true },
    }),
    prisma.companyAccessGrant.findMany({
      where: { platformAdminId: id },
      orderBy: { createdAt: 'desc' },
      select: {
        company: {
          select: { id: true, name: true, createdAt: true, isBlocked: true },
        },
      },
    }),
  ]);

  return {
    id: marketer.id,
    name: marketer.name,
    email: marketer.email,
    phone: marketer.phone,
    avatarUrl: marketer.avatarUrl,
    telegram: marketer.telegram,
    vk: marketer.vk,
    max: marketer.max,
    isActive: marketer.isActive,
    invitePending: marketer.passwordHash === null,
    lastLoginAt: marketer.lastLoginAt?.toISOString() ?? null,
    createdAt: marketer.createdAt.toISOString(),
    companies: ownedCompanies.map((company) => ({
      id: company.id,
      name: company.name,
      createdAt: company.createdAt.toISOString(),
      isBlocked: company.isBlocked,
    })),
    grantedCompanies: grants.map((grant) => ({
      id: grant.company.id,
      name: grant.company.name,
      createdAt: grant.company.createdAt.toISOString(),
      isBlocked: grant.company.isBlocked,
    })),
  };
}

export async function generateMetadata({
  params,
}: MarketerDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const marketer = await prisma.platformAdmin.findUnique({
    where: { id },
    select: { name: true },
  });

  return {
    title: marketer?.name ?? 'Маркетолог',
  };
}

export default async function MarketerDetailPage({
  params,
}: MarketerDetailPageProps) {
  await requirePlatformSession({ roles: ['SUPER_ADMIN'] });
  const { id } = await params;
  const marketer = await loadMarketerDetail(id);

  if (!marketer) {
    notFound();
  }

  return <MarketerDetailPageClient marketer={marketer} />;
}
