import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { deleteCompanyData } from '@/lib/platform/deleteCompany';
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

  // Единый источник правды по удалению — lib/platform/deleteCompany.ts (та же
  // функция, что и у эндпоинта DELETE /api/platform/companies/:id), чтобы список
  // таблиц не расходился между CLI и приложением.
  // Очистку S3 (cleanupCompanyAssets) CLI не вызывает намеренно: она зависит от
  // `lib/s3` → `server-only`, который не резолвится в tsx. Осиротевшие файлы при
  // удалении через CLI можно почистить вручную; из UI-эндпоинта S3 чистится.
  const info = await deleteCompanyData(companyId);

  console.log(`Компания "${info.companyName}" (${companyId}) удалена.`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
