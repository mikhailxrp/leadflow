import 'server-only';

import { prisma } from '@/lib/prisma';
import { isEmailConfigured } from '@/lib/email';
import { isPlatformCompany, resolveOwnerRoles } from '@/lib/platform/companyVisibility';
import { getSubscriptionStatus } from '@/lib/platform/subscription';
import { sendSubscriptionReminderEmail } from '@/lib/platform/sendSubscriptionReminderEmail';
import type { SubscriptionStatus } from '@/types/platform';

export type CompanyNeedingRenewal = {
  id: string;
  name: string;
  nextPaymentAt: Date;
  status: Extract<SubscriptionStatus, 'expiring' | 'overdue'>;
  daysUntilDue: number;
  createdByPlatformAdminId: string | null;
};

export type SubscriptionDigestResult = {
  companies: number;
  emailsSent: number;
};

export async function collectCompaniesNeedingRenewal(
  now: Date = new Date(),
): Promise<CompanyNeedingRenewal[]> {
  const companies = await prisma.company.findMany({
    where: { nextPaymentAt: { not: null } },
    select: {
      id: true,
      name: true,
      nextPaymentAt: true,
      createdByPlatformAdminId: true,
    },
  });

  const needingRenewal: CompanyNeedingRenewal[] = [];

  for (const company of companies) {
    if (!company.nextPaymentAt) {
      continue;
    }

    const { status, daysUntilDue } = getSubscriptionStatus(
      company.nextPaymentAt,
      now,
    );

    if (status !== 'expiring' && status !== 'overdue') {
      continue;
    }

    if (daysUntilDue === null) {
      continue;
    }

    needingRenewal.push({
      id: company.id,
      name: company.name,
      nextPaymentAt: company.nextPaymentAt,
      status,
      daysUntilDue,
      createdByPlatformAdminId: company.createdByPlatformAdminId,
    });
  }

  needingRenewal.sort(
    (left, right) => left.nextPaymentAt.getTime() - right.nextPaymentAt.getTime(),
  );

  return needingRenewal;
}

export async function sendSubscriptionDigest(
  now: Date = new Date(),
): Promise<SubscriptionDigestResult> {
  const companies = await collectCompaniesNeedingRenewal(now);

  if (companies.length === 0) {
    return { companies: 0, emailsSent: 0 };
  }

  const ownerRoles = await resolveOwnerRoles(
    companies.map((company) => company.createdByPlatformAdminId),
  );

  const platformCompanies: CompanyNeedingRenewal[] = [];
  const marketerCompaniesByOwnerId = new Map<string, CompanyNeedingRenewal[]>();

  for (const company of companies) {
    const ownerId = company.createdByPlatformAdminId;
    const ownerRole = ownerId ? ownerRoles.get(ownerId) : undefined;

    if (!ownerId || isPlatformCompany(company, ownerRole)) {
      platformCompanies.push(company);
      continue;
    }

    const existing = marketerCompaniesByOwnerId.get(ownerId) ?? [];
    existing.push(company);
    marketerCompaniesByOwnerId.set(ownerId, existing);
  }

  const admins = await prisma.platformAdmin.findMany({
    where: {
      isActive: true,
      deletedAt: null,
    },
    select: { id: true, email: true, role: true },
  });

  let emailsSent = 0;

  if (isEmailConfigured()) {
    if (platformCompanies.length > 0) {
      for (const admin of admins) {
        if (admin.role !== 'SUPER_ADMIN') {
          continue;
        }

        await sendSubscriptionReminderEmail({
          email: admin.email,
          companies: platformCompanies,
        });
        emailsSent += 1;
      }
    }

    for (const [ownerId, ownerCompanies] of marketerCompaniesByOwnerId) {
      const marketer = admins.find((admin) => admin.id === ownerId);
      if (!marketer) {
        continue;
      }

      await sendSubscriptionReminderEmail({
        email: marketer.email,
        companies: ownerCompanies,
      });
      emailsSent += 1;
    }
  } else {
    console.warn(
      'Skipping subscription digest emails: SMTP is not configured',
    );
  }

  // Telegram channel — Phase 13

  return {
    companies: companies.length,
    emailsSent,
  };
}
