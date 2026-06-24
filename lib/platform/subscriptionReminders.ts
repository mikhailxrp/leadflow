import 'server-only';

import { prisma } from '@/lib/prisma';
import { isEmailConfigured } from '@/lib/email';
import { getSubscriptionStatus } from '@/lib/platform/subscription';
import { sendSubscriptionReminderEmail } from '@/lib/platform/sendSubscriptionReminderEmail';
import type { SubscriptionStatus } from '@/types/platform';

export type CompanyNeedingRenewal = {
  id: string;
  name: string;
  nextPaymentAt: Date;
  status: Extract<SubscriptionStatus, 'expiring' | 'overdue'>;
  daysUntilDue: number;
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

  const admins = await prisma.platformAdmin.findMany({
    where: {
      isActive: true,
      deletedAt: null,
    },
    select: { email: true },
  });

  let emailsSent = 0;

  if (isEmailConfigured()) {
    for (const admin of admins) {
      await sendSubscriptionReminderEmail({
        email: admin.email,
        companies,
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
