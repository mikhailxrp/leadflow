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

// Показывает host + имя базы из DATABASE_URL без логина/пароля — чтобы оператор
// глазами убедился, что это dev-база, а не prod (они на одном сервере).
function describeTarget(): string {
  const raw = process.env.DATABASE_URL;
  if (!raw) {
    return '(DATABASE_URL не задан)';
  }
  try {
    const url = new URL(raw);
    const dbName = url.pathname.replace(/^\//, '');
    return `${url.host}/${dbName}`;
  } catch {
    return '(не удалось разобрать DATABASE_URL)';
  }
}

async function main(): Promise<void> {
  loadEnvFile();

  // Защита от случайного запуска (в т.ч. по prod-базе на том же сервере).
  if (process.argv[2] !== '--yes') {
    console.error(
      'Это удалит ВСЕ компании со всеми данными и ВСЕХ маркетологов из базы:\n' +
        `  ${describeTarget()}\n\n` +
        'Суперадмины (PlatformRole.SUPER_ADMIN) сохраняются.\n' +
        'Подтверди запуск флагом --yes:\n' +
        '  npx tsx scripts/resetDevData.ts --yes\n' +
        '  npm run reset:dev -- --yes',
    );
    process.exit(1);
  }

  const [companies, users, marketers, superAdmins] = await Promise.all([
    prisma.company.count(),
    prisma.user.count(),
    prisma.platformAdmin.count({ where: { role: 'MARKETER' } }),
    prisma.platformAdmin.count({ where: { role: 'SUPER_ADMIN' } }),
  ]);

  console.log(`Цель: ${describeTarget()}`);
  console.log(
    `К удалению: компаний ${companies}, пользователей ${users}, маркетологов ${marketers}.`,
  );
  console.log(`Сохранится суперадминов: ${superAdmins}.`);

  // Всё удаляем в одной транзакции, дети раньше родителей. Без where по companyId —
  // чистим все компании разом. Токены сброса маркетологов уходят каскадом (onDelete: Cascade).
  await prisma.$transaction([
    // --- данные, ссылающиеся на User / Lead / Company ---
    prisma.notification.deleteMany(),
    prisma.comment.deleteMany(),
    prisma.duplicateFlag.deleteMany(),
    prisma.event.deleteMany(),
    prisma.reminder.deleteMany(),
    prisma.task.deleteMany(),
    prisma.adSpend.deleteMany(),
    prisma.assignmentRule.deleteMany(),
    prisma.apiKey.deleteMany(),
    prisma.integrationSource.deleteMany(),
    prisma.companyInvite.deleteMany(),
    prisma.companyAccessGrant.deleteMany(),
    prisma.userPasswordResetToken.deleteMany(),
    // --- Lead раньше того, на что он ссылается (stage, lossReason, importBatch, user) ---
    prisma.lead.deleteMany(),
    prisma.importBatch.deleteMany(),
    prisma.lossReason.deleteMany(),
    prisma.pipelineStage.deleteMany(),
    prisma.user.deleteMany(),
    prisma.company.deleteMany(),
    // --- маркетологи (суперадмины не трогаются) ---
    prisma.platformAdmin.deleteMany({ where: { role: 'MARKETER' } }),
  ]);

  console.log('Готово: все компании и маркетологи удалены, суперадмины сохранены.');
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
