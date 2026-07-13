import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { PrismaClient, type PipelineStage, type UserRole } from '@prisma/client';
import { hashPassword } from '@/lib/password';
import {
  DEFAULT_COMPANY_SETTINGS,
  DEFAULT_LOSS_REASONS,
  DEFAULT_STAGES,
} from '@/constants/defaultCompanyData';

// Отдельный, не расширенный клиент — `lib/prisma.ts` намеренно блокирует любые
// мутации демо-компании (см. комментарий там), а этому скрипту как раз нужно
// её наполнять и пересоздавать лиды при каждом запуске.
const prisma = new PrismaClient();

const DEMO_COMPANY_NAME = 'Демо-компания «Лид-Канал»';

const DEMO_USERS: { email: string; name: string; role: UserRole }[] = [
  { email: 'admin@demo.leadkanal.local', name: 'Анна Смирнова', role: 'ADMIN' },
  { email: 'head@demo.leadkanal.local', name: 'Дмитрий Ковалёв', role: 'HEAD' },
  { email: 'manager1@demo.leadkanal.local', name: 'Мария Иванова', role: 'MANAGER' },
  { email: 'manager2@demo.leadkanal.local', name: 'Игорь Петров', role: 'MANAGER' },
];

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
    // .env необязателен, если переменные уже заданы в окружении
  }
}

function daysAgo(days: number, hours = 0): Date {
  return new Date(
    Date.now() - days * 24 * 60 * 60 * 1000 - hours * 60 * 60 * 1000,
  );
}

async function ensureCompany() {
  const existing = await prisma.company.findFirst({ where: { isDemo: true } });
  if (existing) return existing;

  return prisma.company.create({
    data: {
      name: DEMO_COMPANY_NAME,
      isDemo: true,
      settings: DEFAULT_COMPANY_SETTINGS,
      nextPaymentAt: daysAgo(-365 * 5),
    },
  });
}

async function ensureStages(companyId: string): Promise<PipelineStage[]> {
  const existing = await prisma.pipelineStage.findMany({
    where: { companyId },
    orderBy: { order: 'asc' },
  });
  if (existing.length > 0) return existing;

  await prisma.pipelineStage.createMany({ data: DEFAULT_STAGES(companyId) });
  return prisma.pipelineStage.findMany({
    where: { companyId },
    orderBy: { order: 'asc' },
  });
}

async function ensureLossReasons(companyId: string) {
  const existing = await prisma.lossReason.findMany({
    where: { companyId },
    orderBy: { order: 'asc' },
  });
  if (existing.length > 0) return existing;

  await prisma.lossReason.createMany({ data: DEFAULT_LOSS_REASONS(companyId) });
  return prisma.lossReason.findMany({
    where: { companyId },
    orderBy: { order: 'asc' },
  });
}

async function ensureUsers(companyId: string) {
  const users = [];
  for (const spec of DEMO_USERS) {
    const user = await prisma.user.upsert({
      where: { email: spec.email },
      update: { companyId, name: spec.name, role: spec.role },
      create: {
        companyId,
        email: spec.email,
        name: spec.name,
        role: spec.role,
        passwordHash: await hashPassword(randomUUID()),
      },
    });
    users.push(user);
  }
  return users;
}

async function reseedLeads(
  companyId: string,
  stages: PipelineStage[],
  lossReasons: { id: string; label: string }[],
  users: { id: string; role: UserRole }[],
): Promise<void> {
  // Каскад: Comment/Task/Reminder/DuplicateFlag/Event(leadId) удалятся вместе с лидом.
  await prisma.lead.deleteMany({ where: { companyId } });

  const [stageNew, stageQualify, stageNegotiate, stageOffer, stageClosed] = stages;
  const [lossExpensive, lossCompetitor] = lossReasons;
  const [admin, head, manager1, manager2] = users;

  type LeadSeed = {
    key: string;
    name: string;
    phone: string;
    email?: string;
    comment?: string;
    source: string;
    stageId: string;
    assignedToId: string | null;
    createdAt: Date;
    utm?: Record<string, string>;
    qualification?: 'QUALIFIED' | 'DISQUALIFIED';
    closeType?: 'WON' | 'LOST';
    lossReasonId?: string;
  };

  const leadSeeds: LeadSeed[] = [
    {
      key: 'volkov',
      name: 'Сергей Волков',
      phone: '+79161234501',
      email: 'volkov@example.com',
      comment: 'Интересует внедрение под отдел из 20 менеджеров',
      source: 'tilda',
      stageId: stageNew.id,
      assignedToId: null,
      createdAt: daysAgo(0, 2),
      utm: { utm_source: 'yandex', utm_medium: 'cpc', utm_campaign: 'brand' },
    },
    {
      key: 'orlova',
      name: 'Екатерина Орлова',
      phone: '+79161234502',
      source: 'wordpress',
      stageId: stageNew.id,
      assignedToId: manager2.id,
      createdAt: daysAgo(0, 5),
    },
    {
      key: 'petrov',
      name: 'Алексей Петров',
      phone: '+79161234503',
      email: 'petrov.a@example.com',
      comment: 'Просил перезвонить после обеда',
      source: 'manual',
      stageId: stageQualify.id,
      assignedToId: manager1.id,
      createdAt: daysAgo(1),
      qualification: 'QUALIFIED',
    },
    {
      key: 'nikitina',
      name: 'Ольга Никитина',
      phone: '+79161234504',
      source: 'api',
      stageId: stageQualify.id,
      assignedToId: manager2.id,
      createdAt: daysAgo(2),
    },
    {
      key: 'sidorov',
      name: 'Максим Сидоров',
      phone: '+79161234505',
      email: 'sidorov@example.com',
      comment: 'Сравнивает с двумя другими CRM',
      source: 'yandex_direct',
      stageId: stageNegotiate.id,
      assignedToId: manager1.id,
      createdAt: daysAgo(3),
      utm: { utm_source: 'yandex', utm_medium: 'cpc', yclid: '1234567890' },
    },
    {
      key: 'fedorova',
      name: 'Татьяна Фёдорова',
      phone: '+79161234506',
      source: 'tilda',
      stageId: stageNegotiate.id,
      assignedToId: head.id,
      createdAt: daysAgo(4),
      qualification: 'QUALIFIED',
    },
    {
      key: 'kuznetsov',
      name: 'Дмитрий Кузнецов',
      phone: '+79161234507',
      email: 'kuznetsov@example.com',
      comment: 'Ждём коммерческое предложение',
      source: 'wordpress',
      stageId: stageOffer.id,
      assignedToId: manager1.id,
      createdAt: daysAgo(5),
    },
    {
      key: 'belova',
      name: 'Наталья Белова',
      phone: '+79161234508',
      source: 'manual',
      stageId: stageOffer.id,
      assignedToId: manager2.id,
      createdAt: daysAgo(6),
      qualification: 'DISQUALIFIED',
    },
    {
      key: 'morozov',
      name: 'Иван Морозов',
      phone: '+79161234509',
      email: 'morozov@example.com',
      source: 'tilda',
      stageId: stageClosed.id,
      assignedToId: manager1.id,
      createdAt: daysAgo(8),
      closeType: 'WON',
    },
    {
      key: 'kozlova',
      name: 'Виктория Козлова',
      phone: '+79161234510',
      source: 'api',
      stageId: stageClosed.id,
      assignedToId: manager2.id,
      createdAt: daysAgo(9),
      closeType: 'LOST',
      lossReasonId: lossExpensive?.id,
    },
    {
      key: 'egorov',
      name: 'Артём Егоров',
      phone: '+79161234511',
      source: 'wordpress',
      stageId: stageClosed.id,
      assignedToId: head.id,
      createdAt: daysAgo(11),
      closeType: 'LOST',
      lossReasonId: lossCompetitor?.id,
    },
    {
      key: 'novikova',
      name: 'Юлия Новикова',
      phone: '+79161234512',
      email: 'novikova@example.com',
      comment: 'Свежая заявка, ещё не в работе',
      source: 'tilda',
      stageId: stageNew.id,
      assignedToId: null,
      createdAt: daysAgo(0, 0.5),
    },
  ];

  const created = new Map<string, string>();

  for (const seed of leadSeeds) {
    const lead = await prisma.lead.create({
      data: {
        companyId,
        name: seed.name,
        phone: seed.phone,
        email: seed.email,
        comment: seed.comment,
        source: seed.source,
        stageId: seed.stageId,
        assignedToId: seed.assignedToId,
        createdAt: seed.createdAt,
        utm: seed.utm ?? {},
        qualification: seed.qualification,
        qualifiedAt: seed.qualification ? seed.createdAt : undefined,
        closeType: seed.closeType,
        closedAt: seed.closeType ? daysAgo(0) : undefined,
        lossReasonId: seed.lossReasonId,
      },
    });
    created.set(seed.key, lead.id);

    await prisma.event.create({
      data: {
        companyId,
        leadId: lead.id,
        type: 'LEAD_CREATED',
        payload: { source: seed.source },
        createdAt: seed.createdAt,
      },
    });
  }

  const petrovId = created.get('petrov');
  if (petrovId) {
    await prisma.comment.create({
      data: {
        leadId: petrovId,
        userId: manager1.id,
        text: 'Созвонились, интересует тариф на 15 пользователей.',
      },
    });
    await prisma.task.create({
      data: {
        companyId,
        leadId: petrovId,
        createdById: manager1.id,
        assignedToId: manager1.id,
        title: 'Перезвонить с деталями тарифа',
        dueDate: daysAgo(-1),
      },
    });
  }

  const sidorovId = created.get('sidorov');
  if (sidorovId) {
    await prisma.comment.create({
      data: {
        leadId: sidorovId,
        userId: manager1.id,
        text: 'Отправил сравнение с конкурентами, ждём решения.',
      },
    });
    await prisma.reminder.create({
      data: {
        companyId,
        leadId: sidorovId,
        createdById: manager1.id,
        text: 'Уточнить решение по сравнению',
        remindAt: daysAgo(-1),
        channels: ['telegram'],
      },
    });
  }
}

async function main(): Promise<void> {
  loadEnvFile();

  const company = await ensureCompany();
  const stages = await ensureStages(company.id);
  const lossReasons = await ensureLossReasons(company.id);
  const users = await ensureUsers(company.id);

  await reseedLeads(company.id, stages, lossReasons, users);

  console.log('Демо-компания готова:');
  console.log(`  Компания : "${company.name}" (id: ${company.id})`);
  console.log(`  Пользователей: ${users.length}`);
  console.log(`  Лидов создано: 12`);
  console.log('\nВход: APP_URL + /demo');
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
