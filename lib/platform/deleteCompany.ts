// Внимание: без `import 'server-only'`. Этот модуль намеренно импортирует только
// prisma (без S3) и используется как из Next-эндпоинта, так и из CLI-скрипта
// `scripts/deleteCompany.ts` через tsx. Пакет `server-only` резолвится только
// бандлером Next (в node/tsx его нет), поэтому его импорт здесь сломал бы CLI.
// S3-очистка вынесена в `lib/platform/cleanupCompanyAssets.ts` (server-only, только эндпоинт).

import { prisma } from '@/lib/prisma';

export type DeletedCompanyAdmin = {
  name: string;
  email: string;
};

export type DeletedCompanyInfo = {
  companyId: string;
  companyName: string;
  admins: DeletedCompanyAdmin[];
  /** logoUrl компании + avatarUrl пользователей — для best-effort очистки S3 после коммита. */
  assetUrls: string[];
};

/**
 * Полностью удаляет заблокированную компанию и все её данные в одной транзакции.
 *
 * Список ниже покрывает ВСЕ таблицы с FK на Company (прямым `companyId` или через `lead`),
 * в порядке «дети раньше родителей». Ни одна связь Company→child не объявляет
 * `onDelete: Cascade`, поэтому каждую таблицу нужно чистить явно, иначе финальный
 * `company.delete` упадёт по внешнему ключу. Каждый запрос ограничен `companyId` — данные
 * других компаний и платформенных пользователей не затрагиваются.
 *
 * Контакты администраторов и ссылки на файлы S3 собираются ДО удаления и возвращаются
 * вызывающему коду: письмо платформенным админам и очистка S3 выполняются уже после
 * коммита, чтобы их возможный сбой не откатывал удаление данных.
 */
export async function deleteCompanyData(
  companyId: string,
): Promise<DeletedCompanyInfo> {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { id: true, name: true, logoUrl: true },
  });

  if (!company) {
    throw new Error(`Company ${companyId} not found`);
  }

  const users = await prisma.user.findMany({
    where: { companyId },
    select: { role: true, name: true, email: true, avatarUrl: true },
  });

  const admins = users
    .filter((user) => user.role === 'ADMIN')
    .map((user) => ({ name: user.name, email: user.email }));

  const assetUrls = [
    company.logoUrl,
    ...users.map((user) => user.avatarUrl),
  ].filter((url): url is string => Boolean(url));

  await prisma.$transaction([
    prisma.notification.deleteMany({ where: { companyId } }),
    prisma.reminder.deleteMany({ where: { companyId } }),
    prisma.task.deleteMany({ where: { companyId } }),
    prisma.duplicateFlag.deleteMany({ where: { companyId } }),
    prisma.comment.deleteMany({ where: { lead: { companyId } } }),
    prisma.event.deleteMany({ where: { companyId } }),
    prisma.adSpend.deleteMany({ where: { companyId } }),
    prisma.lead.deleteMany({ where: { companyId } }),
    prisma.assignmentRule.deleteMany({ where: { companyId } }),
    prisma.apiKey.deleteMany({ where: { companyId } }),
    prisma.integrationSource.deleteMany({ where: { companyId } }),
    prisma.importBatch.deleteMany({ where: { companyId } }),
    prisma.lossReason.deleteMany({ where: { companyId } }),
    prisma.pipelineStage.deleteMany({ where: { companyId } }),
    prisma.companyInvite.deleteMany({ where: { companyId } }),
    prisma.companyAccessGrant.deleteMany({ where: { companyId } }),
    prisma.user.deleteMany({ where: { companyId } }),
    prisma.company.delete({ where: { id: companyId } }),
  ]);

  return {
    companyId: company.id,
    companyName: company.name,
    admins,
    assetUrls,
  };
}
