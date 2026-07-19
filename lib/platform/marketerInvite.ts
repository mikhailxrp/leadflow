import { hashPassword } from '@/lib/password';
import { prisma, type PrismaTransactionClient } from '@/lib/prisma';
import { generateToken, hashToken } from '@/lib/tokens';
import type { AcceptMarketerInviteInput } from '@/lib/validations/platform';

const INVITE_EXPIRY_DAYS = 7;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Гасит все прежние неиспользованные приглашения маркетолога и выпускает новое.
 * Возвращает сырой токен (хранится в базе только его хэш).
 */
export async function issueMarketerInvite(
  tx: PrismaTransactionClient,
  adminId: string,
): Promise<string> {
  await tx.platformAdminInvite.updateMany({
    where: { adminId, usedAt: null },
    data: { usedAt: new Date() },
  });

  const token = generateToken();
  await tx.platformAdminInvite.create({
    data: {
      adminId,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + INVITE_EXPIRY_DAYS * MS_PER_DAY),
    },
  });

  return token;
}

export type ValidMarketerInvite = {
  adminId: string;
  email: string;
  name: string;
};

export async function findValidMarketerInviteByToken(
  token: string,
): Promise<ValidMarketerInvite | null> {
  const invite = await prisma.platformAdminInvite.findUnique({
    where: { tokenHash: hashToken(token) },
    select: {
      adminId: true,
      usedAt: true,
      expiresAt: true,
      admin: {
        select: {
          email: true,
          name: true,
          role: true,
          isActive: true,
          deletedAt: true,
        },
      },
    },
  });

  if (
    !invite ||
    invite.usedAt ||
    invite.expiresAt < new Date() ||
    invite.admin.role !== 'MARKETER' ||
    !invite.admin.isActive ||
    invite.admin.deletedAt
  ) {
    return null;
  }

  return {
    adminId: invite.adminId,
    email: invite.admin.email,
    name: invite.admin.name,
  };
}

/**
 * Подтверждение приглашения маркетолога: задаёт пароль (и, при желании,
 * уточняет имя), гасит приглашение. Возвращает email для автологина.
 */
export async function acceptMarketerInvite({
  token,
  name,
  password,
}: AcceptMarketerInviteInput): Promise<{ adminId: string; email: string }> {
  const tokenHash = hashToken(token);
  const passwordHash = await hashPassword(password);
  const now = new Date();

  return prisma.$transaction(async (tx) => {
    const invite = await tx.platformAdminInvite.findUnique({
      where: { tokenHash },
      select: {
        id: true,
        adminId: true,
        usedAt: true,
        expiresAt: true,
        admin: {
          select: {
            email: true,
            role: true,
            isActive: true,
            deletedAt: true,
          },
        },
      },
    });

    if (
      !invite ||
      invite.usedAt ||
      invite.expiresAt < now ||
      invite.admin.role !== 'MARKETER' ||
      !invite.admin.isActive ||
      invite.admin.deletedAt
    ) {
      throw new Error('INVITE_INVALID');
    }

    await tx.platformAdmin.update({
      where: { id: invite.adminId },
      data: {
        passwordHash,
        name: name.trim(),
      },
    });

    await tx.platformAdminInvite.update({
      where: { id: invite.id },
      data: { usedAt: now },
    });

    return { adminId: invite.adminId, email: invite.admin.email };
  });
}
