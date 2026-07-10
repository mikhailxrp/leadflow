import 'server-only';

import { prisma } from '@/lib/prisma';
import { generateToken, hashToken } from '@/lib/tokens';

const BIND_TOKEN_TTL_MS = 15 * 60 * 1000;

/**
 * Создаёт одноразовый bind-токен для пользователя: в БД остаётся только хэш,
 * plaintext возвращается вызывающему для сборки deep-link и нигде не сохраняется.
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

/**
 * Резолвит plaintext-токен в userId, атомарно (одним SQL UPDATE ... RETURNING) проставляя
 * telegramChatId и обнуляя bind-поля — условие по хэшу+сроку и запись выполняются в одной
 * операции, поэтому повторный/параллельный вызов с тем же токеном не находит совпадения.
 * Просроченный/неизвестный токен → null, без исключения (вебхук должен отвечать 200).
 */
export async function resolveBindToken(
  token: string,
  chatId: string,
): Promise<{ userId: string } | null> {
  // `telegramBindTokenExpiresAt` is a naive `timestamp` column, written by Prisma as a UTC
  // wall-clock value. Bare `NOW()` is a `timestamptz` and Postgres casts it to `timestamp`
  // using the session timezone (not necessarily UTC), silently shifting the comparison —
  // `AT TIME ZONE 'UTC'` forces the same UTC wall-clock representation on both sides.
  const rows = await prisma.$queryRaw<{ id: string }[]>`
    UPDATE "User"
    SET "telegramChatId" = ${chatId},
        "telegramBindTokenHash" = NULL,
        "telegramBindTokenExpiresAt" = NULL
    WHERE "telegramBindTokenHash" = ${hashToken(token)}
      AND "telegramBindTokenExpiresAt" > (NOW() AT TIME ZONE 'UTC')
    RETURNING "id"
  `;

  const record = rows[0];
  return record ? { userId: record.id } : null;
}
