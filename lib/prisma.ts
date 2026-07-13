import { PrismaClient } from "@prisma/client";

export class DemoReadOnlyError extends Error {
  constructor(model: string, operation: string) {
    super(`Demo company is read-only: blocked ${model}.${operation}`);
    this.name = "DemoReadOnlyError";
  }
}

const WRITE_OPERATIONS = new Set([
  "create",
  "createMany",
  "createManyAndReturn",
  "update",
  "updateMany",
  "updateManyAndReturn",
  "upsert",
  "delete",
  "deleteMany",
]);

// Кэш id демо-компании на процесс: демо-компания создаётся один раз seed-скриптом
// и не меняется в рантайме, поэтому лишний запрос на каждую мутацию не нужен.
// После первого запуска seed-скрипта на уже поднятом сервере кэш обновится только
// при перезапуске процесса — это ожидаемо и не является багом.
let demoCompanyId: string | null | undefined;

function createPrismaClient() {
  const client = new PrismaClient();

  return client.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (WRITE_OPERATIONS.has(operation)) {
            if (demoCompanyId === undefined) {
              const demoCompany = await client.company.findFirst({
                where: { isDemo: true },
                select: { id: true },
              });
              demoCompanyId = demoCompany?.id ?? null;
            }

            // Демо — читаемые тестовые данные, реальных мутаций там быть не должно.
            // Это подстраховка на уровне БД (defense-in-depth), а не единственная
            // проверка — см. `app/(public)/demo/`.
            if (demoCompanyId && JSON.stringify(args).includes(demoCompanyId)) {
              throw new DemoReadOnlyError(model ?? "unknown", operation);
            }
          }

          return query(args);
        },
      },
    },
  });
}

const globalForPrisma = globalThis as unknown as {
  prisma?: ReturnType<typeof createPrismaClient>;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

// Тип `tx` внутри `prisma.$transaction(async (tx) => ...)` на расширенном клиенте —
// не тот же номинальный тип, что генерируемый `Prisma.TransactionClient`. Хелперы,
// принимающие `tx` отдельным параметром (см. `lib/roundRobin.ts`), должны типизировать
// его через этот алиас, а не через `Prisma.TransactionClient`.
export type PrismaTransactionClient = Omit<
  ReturnType<typeof createPrismaClient>,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$extends"
>;
