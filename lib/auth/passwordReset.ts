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

  if (!user || user.isBlocked) {
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
