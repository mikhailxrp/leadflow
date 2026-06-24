import { hashPassword } from '@/lib/password';
import { prisma } from '@/lib/prisma';
import { generateToken, hashToken } from '@/lib/tokens';

const USER_PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;

export async function createUserPasswordResetToken(
  email: string,
): Promise<{ email: string; token: string } | null> {
  const normalizedEmail = email.toLowerCase().trim();
  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: {
      id: true,
      email: true,
      isBlocked: true,
    },
  });

  if (!user) {
    throw new Error('USER_NOT_FOUND');
  }
  if (user.isBlocked) {
    return null;
  }

  const token = generateToken();
  await prisma.userPasswordResetToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + USER_PASSWORD_RESET_TTL_MS),
    },
  });

  return {
    email: user.email,
    token,
  };
}

export async function resetUserPassword(
  token: string,
  password: string,
): Promise<void> {
  const tokenHash = hashToken(token);

  const record = await prisma.userPasswordResetToken.findUnique({
    where: { tokenHash },
    select: { id: true, userId: true, expiresAt: true, usedAt: true },
  });

  if (!record) {
    throw new Error('TOKEN_INVALID');
  }
  if (record.usedAt) {
    throw new Error('TOKEN_USED');
  }
  if (record.expiresAt < new Date()) {
    throw new Error('TOKEN_EXPIRED');
  }

  const passwordHash = await hashPassword(password);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: { passwordHash },
    }),
    prisma.userPasswordResetToken.updateMany({
      where: { userId: record.userId, usedAt: null },
      data: { usedAt: new Date() },
    }),
  ]);
}
