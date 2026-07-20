import 'server-only';

import { prisma } from '@/lib/prisma';
import { generateToken, hashToken } from '@/lib/tokens';

const BIND_TOKEN_TTL_MS = 15 * 60 * 1000;

/**
 * Создаёт одноразовый bind-токен для пользователя: в БД остаётся только хэш,
 * plaintext возвращается вызывающему для сборки deep-link и нигде не сохраняется.
 *
 * Резолв токена (`resolveBindToken`) вынесен в `lib/telegram/resolveBindToken.ts` без
 * server-only, т.к. его потребитель — polling-воркер вне бандла Next. Создание же токена
 * дёргается только из API-роута `/api/telegram/bind`, поэтому остаётся server-only здесь.
 */
export async function createBindToken(userId: string): Promise<string> {
  const token = generateToken();

  await prisma.user.update({
    where: { id: userId },
    data: {
      telegramBindTokenHash: hashToken(token),
      telegramBindTokenExpiresAt: new Date(Date.now() + BIND_TOKEN_TTL_MS),
    },
  });

  return token;
}
