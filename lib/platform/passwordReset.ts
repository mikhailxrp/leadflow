import { hashPassword } from '@/lib/password';
import { prisma } from '@/lib/prisma';
import { generateToken, hashToken } from '@/lib/tokens';

const PLATFORM_PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;

export async function createPlatformPasswordResetToken(
  email: string,
): Promise<{ email: string; token: string } | null> {
  const normalizedEmail = email.toLowerCase().trim();
  const admin = await prisma.platformAdmin.findFirst({
    where: {
      email: normalizedEmail,
      isActive: true,
      deletedAt: null,
    },
    select: {
      id: true,
      email: true,
    },
  });

  if (!admin) {
    return null;
  }

  const token = generateToken();
  await prisma.platformAdminPasswordResetToken.create({
    data: {
      adminId: admin.id,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + PLATFORM_PASSWORD_RESET_TTL_MS),
    },
  });

  return {
    email: admin.email,
    token,
  };
}

export async function resetPlatformAdminPassword(
  token: string,
  password: string,
): Promise<boolean> {
  const tokenHash = hashToken(token);
  const passwordHash = await hashPassword(password);
  const now = new Date();

  return prisma.$transaction(async (tx) => {
    const resetToken = await tx.platformAdminPasswordResetToken.findFirst({
      where: {
        tokenHash,
        usedAt: null,
        expiresAt: { gt: now },
      },
      select: {
        id: true,
        adminId: true,
        admin: {
          select: {
            isActive: true,
            deletedAt: true,
          },
        },
      },
    });

    if (!resetToken || !resetToken.admin.isActive || resetToken.admin.deletedAt) {
      return false;
    }

    await tx.platformAdmin.update({
      where: { id: resetToken.adminId },
      data: { passwordHash },
    });

    await tx.platformAdminPasswordResetToken.updateMany({
      where: {
        adminId: resetToken.adminId,
        usedAt: null,
      },
      data: { usedAt: now },
    });

    return true;
  });
}
