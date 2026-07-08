import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { prisma } from '@/lib/prisma';

function loadEnvFile(): void {
  try {
    const envPath = resolve(process.cwd(), '.env');
    const content = readFileSync(envPath, 'utf8');

    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) {
        continue;
      }

      const eqIndex = trimmed.indexOf('=');
      if (eqIndex === -1) {
        continue;
      }

      const key = trimmed.slice(0, eqIndex).trim();
      const rawValue = trimmed.slice(eqIndex + 1).trim();
      const value = rawValue.replace(/^["']|["']$/g, '');

      if (!(key in process.env)) {
        process.env[key] = value;
      }
    }
  } catch {
    // .env is optional if variables are already set in the environment
  }
}

async function main(): Promise<void> {
  loadEnvFile();

  const companyId = process.argv[2];
  if (!companyId) {
    throw new Error('Usage: npx tsx scripts/deleteCompany.ts <companyId>');
  }

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { id: true, name: true },
  });

  if (!company) {
    throw new Error(`Компания с id "${companyId}" не найдена.`);
  }

  // Удаляем всё, что ссылается на компанию, в порядке зависимостей (дети раньше
  // родителей), затем саму компанию. Каждый запрос ограничен companyId — данные
  // других компаний и платформенных администраторов не затрагиваются.
  await prisma.$transaction([
    prisma.reminder.deleteMany({ where: { companyId } }),
    prisma.task.deleteMany({ where: { companyId } }),
    prisma.duplicateFlag.deleteMany({ where: { companyId } }),
    prisma.comment.deleteMany({ where: { lead: { companyId } } }),
    prisma.event.deleteMany({ where: { companyId } }),
    prisma.lead.deleteMany({ where: { companyId } }),
    prisma.assignmentRule.deleteMany({ where: { companyId } }),
    prisma.apiKey.deleteMany({ where: { companyId } }),
    prisma.integrationSource.deleteMany({ where: { companyId } }),
    prisma.importBatch.deleteMany({ where: { companyId } }),
    prisma.lossReason.deleteMany({ where: { companyId } }),
    prisma.pipelineStage.deleteMany({ where: { companyId } }),
    prisma.companyInvite.deleteMany({ where: { companyId } }),
    prisma.user.deleteMany({ where: { companyId } }),
    prisma.company.delete({ where: { id: companyId } }),
  ]);

  console.log(`Компания "${company.name}" (${companyId}) удалена.`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
