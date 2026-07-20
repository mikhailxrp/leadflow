import { prisma } from '@/lib/prisma';
import { hashToken } from '@/lib/tokens';

// Намеренно БЕЗ `import 'server-only'`: используется polling-воркером (`scripts/telegramPolling.ts`),
// который запускается вне бандла Next через tsx, где server-only бросает на импорте. Ни одна
// клиентская зона его не импортирует (только воркер), поэтому гейт здесь не нужен.

/**
 * Резолвит plaintext-токен в userId, атомарно (одним SQL UPDATE ... RETURNING) проставляя
 * telegramChatId и обнуляя bind-поля — условие по хэшу+сроку и запись выполняются в одной
 * операции, поэтому повторный/параллельный вызов с тем же токеном не находит совпадения.
 * Просрочённый/неизвестный токен → null, без исключения.
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
