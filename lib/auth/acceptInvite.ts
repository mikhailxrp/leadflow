import type { CompanyInvite } from '@prisma/client';
import { hashPassword } from '@/lib/password';
import { prisma } from '@/lib/prisma';
import { hashToken } from '@/lib/tokens';
import type { AcceptInviteInput } from '@/lib/validations/auth';

export type ValidInvite = Pick<CompanyInvite, 'id' | 'email' | 'companyId' | 'expiresAt'>;

export async function findValidInviteByToken(
  token: string,
): Promise<ValidInvite | null> {
  const invite = await prisma.companyInvite.findUnique({
    where: { tokenHash: hashToken(token) },
    select: {
      id: true,
      email: true,
      companyId: true,
      expiresAt: true,
      usedAt: true,
    },
  });

  if (!invite || invite.usedAt || invite.expiresAt < new Date()) {
    return null;
  }

  return {
    id: invite.id,
    email: invite.email,
    companyId: invite.companyId,
    expiresAt: invite.expiresAt,
  };
}

export async function acceptInvite({
  token,
  name,
  password,
}: AcceptInviteInput): Promise<{ userId: string; companyId: string }> {
  const invite = await findValidInviteByToken(token);
  if (!invite) {
    throw new Error('INVITE_INVALID');
  }

  const existingUser = await prisma.user.findUnique({
    where: { email: invite.email.toLowerCase() },
    select: { id: true },
  });

  if (existingUser) {
    throw new Error('EMAIL_EXISTS');
  }

  const passwordHash = await hashPassword(password);

  const user = await prisma.$transaction(async (tx) => {
    const currentInvite = await tx.companyInvite.findUnique({
      where: { id: invite.id },
      select: { usedAt: true, expiresAt: true },
    });

    if (
      !currentInvite ||
      currentInvite.usedAt ||
      currentInvite.expiresAt < new Date()
    ) {
      throw new Error('INVITE_INVALID');
    }

    const created = await tx.user.create({
      data: {
        companyId: invite.companyId,
        email: invite.email.toLowerCase(),
        passwordHash,
        name: name.trim(),
        role: 'ADMIN',
      },
      select: { id: true, companyId: true },
    });

    await tx.companyInvite.update({
      where: { id: invite.id },
      data: { usedAt: new Date() },
    });

    await tx.event.create({
      data: {
        companyId: invite.companyId,
        type: 'USER_CREATED',
        userId: created.id,
        payload: { via: 'accept-invite' },
      },
    });

    return created;
  });

  return { userId: user.id, companyId: user.companyId };
}
