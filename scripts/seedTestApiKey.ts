import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { randomBytes, createHash } from 'node:crypto';
import { prisma } from '@/lib/prisma';

const KEY_NAME = 'test-api-key';
const SOURCE_LABEL = 'test';

function loadEnvFile(): void {
  try {
    const envPath = resolve(process.cwd(), '.env');
    const content = readFileSync(envPath, 'utf8');

    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      const eqIndex = trimmed.indexOf('=');
      if (eqIndex === -1) continue;

      const key = trimmed.slice(0, eqIndex).trim();
      const rawValue = trimmed.slice(eqIndex + 1).trim();
      const value = rawValue.replace(/^["']|["']$/g, '');

      if (!(key in process.env)) {
        process.env[key] = value;
      }
    }
  } catch {
    // .env is optional if env vars are already set
  }
}

async function main(): Promise<void> {
  loadEnvFile();

  const existing = await prisma.apiKey.findFirst({
    where: { name: KEY_NAME },
    select: { id: true, companyId: true },
  });

  if (existing) {
    console.log(
      `ApiKey "${KEY_NAME}" уже существует (id: ${existing.id}, companyId: ${existing.companyId}). Повторное создание не требуется.`,
    );
    return;
  }

  const company = await prisma.company.findFirst({
    select: { id: true, name: true },
  });

  if (!company) {
    throw new Error(
      'Нет ни одной компании в БД. Сначала создайте компанию через платформенного администратора.',
    );
  }

  const plainKey = randomBytes(32).toString('hex');
  const keyHash = createHash('sha256').update(plainKey).digest('hex');

  const apiKey = await prisma.apiKey.create({
    data: {
      companyId: company.id,
      name: KEY_NAME,
      keyHash,
      sourceLabel: SOURCE_LABEL,
    },
  });

  console.log(`\nApiKey создан:`);
  console.log(`  Компания : "${company.name}" (id: ${company.id})`);
  console.log(`  ApiKey id: ${apiKey.id}`);
  console.log(`  Название : ${KEY_NAME}`);
  console.log(`  Source   : ${SOURCE_LABEL}`);
  console.log(`\nPlain key (сохраните — больше не показывается):`);
  console.log(`  ${plainKey}`);
  console.log(`\nПример использования:`);
  console.log(`  curl -X POST http://localhost:3000/api/webhooks/leads \\`);
  console.log(`    -H "X-API-Key: ${plainKey}" \\`);
  console.log(`    -H "Content-Type: application/json" \\`);
  console.log(`    -d '{"name":"Тест","phone":"+71234567890"}'`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
