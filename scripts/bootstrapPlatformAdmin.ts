import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { hashPassword } from '@/lib/password';
import { prisma } from '@/lib/prisma';

const PLATFORM_ADMIN_DEFAULT_NAME = 'Платформенный администратор';

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

  const existing = await prisma.platformAdmin.count();
  if (existing > 0) {
    console.log(
      'Платформенный администратор уже существует, bootstrap не требуется.',
    );
    return;
  }

  const email = process.env.PLATFORM_ADMIN_BOOTSTRAP_EMAIL;
  const password = process.env.PLATFORM_ADMIN_BOOTSTRAP_PASSWORD;

  if (!email || !password) {
    throw new Error(
      'PLATFORM_ADMIN_BOOTSTRAP_EMAIL и PLATFORM_ADMIN_BOOTSTRAP_PASSWORD должны быть заданы в .env',
    );
  }

  await prisma.platformAdmin.create({
    data: {
      email: email.toLowerCase().trim(),
      passwordHash: await hashPassword(password),
      name: PLATFORM_ADMIN_DEFAULT_NAME,
    },
  });

  console.log('Платформенный администратор создан.');
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
