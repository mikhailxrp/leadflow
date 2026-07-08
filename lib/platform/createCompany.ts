import type { Company } from '@prisma/client';
import {
  DEFAULT_COMPANY_SETTINGS,
  DEFAULT_LOSS_REASONS,
  DEFAULT_STAGES,
} from '@/constants/defaultCompanyData';
import { prisma } from '@/lib/prisma';
import { generateToken, hashToken } from '@/lib/tokens';

const INVITE_EXPIRY_DAYS = 7;
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MS_PER_YEAR = 365 * MS_PER_DAY;

function defaultNextPaymentAt(from: Date = new Date()): Date {
  return new Date(from.getTime() + MS_PER_YEAR);
}

export type CreateCompanyInput = {
  name: string;
  adminEmail: string;
  createdByPlatformAdminId: string;
};

export type CreateCompanyResult = {
  company: Company;
  inviteToken: string;
};

export async function createCompany({
  name,
  adminEmail,
  createdByPlatformAdminId,
}: CreateCompanyInput): Promise<CreateCompanyResult> {
  const inviteToken = generateToken();

  const company = await prisma.$transaction(async (tx) => {
    const created = await tx.company.create({
      data: {
        name,
        settings: DEFAULT_COMPANY_SETTINGS,
        nextPaymentAt: defaultNextPaymentAt(),
        createdByPlatformAdminId,
      },
    });

    await tx.pipelineStage.createMany({
      data: DEFAULT_STAGES(created.id),
    });

    await tx.lossReason.createMany({
      data: DEFAULT_LOSS_REASONS(created.id),
    });

    await tx.companyInvite.create({
      data: {
        companyId: created.id,
        email: adminEmail,
        tokenHash: hashToken(inviteToken),
        expiresAt: new Date(Date.now() + INVITE_EXPIRY_DAYS * MS_PER_DAY),
      },
    });

    await tx.event.create({
      data: {
        companyId: created.id,
        type: 'COMPANY_CREATED',
      },
    });

    return created;
  });

  return { company, inviteToken };
}
