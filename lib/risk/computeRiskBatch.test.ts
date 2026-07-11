import { describe, expect, it, vi } from 'vitest';
import { computeRiskBatch } from '@/lib/risk/computeRiskBatch';
import type { LeadListItem } from '@/lib/leads/getLeads';

type PrismaLike = Parameters<typeof computeRiskBatch>[2];

type FakeEvent = {
  leadId: string | null;
  type: 'LEAD_TAKEN_IN_WORK' | 'STAGE_CHANGED';
  createdAt: Date;
};

type FakeTask = {
  leadId: string;
  title: string;
  dueDate: Date | null;
};

function makeFakePrisma(events: FakeEvent[], tasks: FakeTask[]) {
  const eventFindMany = vi.fn().mockResolvedValue(events);
  const taskFindMany = vi.fn().mockResolvedValue(tasks);
  const prisma = {
    event: { findMany: eventFindMany },
    task: { findMany: taskFindMany },
  } as unknown as PrismaLike;
  return { prisma, eventFindMany, taskFindMany };
}

const NOW = Date.now();
const MS_PER_MINUTE = 60_000;
const MS_PER_DAY = 86_400_000;

function minutesAgo(minutes: number): Date {
  return new Date(NOW - minutes * MS_PER_MINUTE);
}

function daysAgo(days: number): Date {
  return new Date(NOW - days * MS_PER_DAY);
}

function isoMinutesAgo(minutes: number): string {
  return minutesAgo(minutes).toISOString();
}

function isoDaysAgo(days: number): string {
  return daysAgo(days).toISOString();
}

const baseSettings = {
  assignMode: 'MANUAL',
  leadVisibility: 'ALL',
  roundRobinCursor: null,
  telegramEnabled: false,
  controlEnabled: false,
  reactionNorms: {
    defaultMinutes: 30,
    reminderBeforePercent: 66,
    escalateAfterPercent: 133,
    workHoursOnly: false,
  },
  stageStuckDaysDefault: 5,
  stuckCheckTime: '09:00',
  sourceHealthThresholdHours: 3,
};

function makeLead(overrides: Partial<LeadListItem> = {}): LeadListItem {
  return {
    id: 'lead-1',
    name: 'Иван Иванов',
    phone: '+79990000000',
    email: null,
    source: 'tilda',
    createdAt: isoMinutesAgo(10),
    closeType: null,
    qualification: null,
    lossReason: null,
    hasDuplicate: false,
    firstMatchedLeadId: null,
    assignedTo: { id: 'user-1', name: 'Менеджер' },
    stage: { id: 'stage-1', name: 'Новый лид', color: '#6366f1', stageTimeLimitDays: null },
    ...overrides,
  };
}

describe('computeRiskBatch', () => {
  it('выбирает последний (самый свежий) STAGE_CHANGED, а не первый попавшийся в выдаче', async () => {
    const lead = makeLead({
      id: 'lead-1',
      stage: { id: 'stage-1', name: 'Этап', color: '#000000', stageTimeLimitDays: 5 },
    });
    const { prisma } = makeFakePrisma(
      [
        // orderBy: createdAt desc — самое свежее событие идёт первым, как в реальном запросе.
        { leadId: 'lead-1', type: 'STAGE_CHANGED', createdAt: minutesAgo(5) },
        { leadId: 'lead-1', type: 'STAGE_CHANGED', createdAt: daysAgo(30) },
        { leadId: 'lead-1', type: 'LEAD_TAKEN_IN_WORK', createdAt: minutesAgo(9) },
      ],
      [{ leadId: 'lead-1', title: 'Позвонить', dueDate: minutesAgo(-60) }],
    );

    const [result] = await computeRiskBatch([lead], baseSettings, prisma);

    // Если бы был ошибочно выбран STAGE_CHANGED месячной давности, лид считался бы зависшим (red).
    expect(result.risk).toEqual({ level: 'green', reason: null });
  });

  it('детектирует hasTakenInWork по LEAD_TAKEN_IN_WORK независимо для каждого лида в батче', async () => {
    const leadWithoutResponse = makeLead({
      id: 'lead-2',
      createdAt: isoMinutesAgo(60),
      stage: { id: 'stage-2', name: 'Этап', color: '#000000', stageTimeLimitDays: 30 },
    });
    const leadWithResponse = makeLead({
      id: 'lead-3',
      createdAt: isoMinutesAgo(60),
      stage: { id: 'stage-2', name: 'Этап', color: '#000000', stageTimeLimitDays: 30 },
    });

    const { prisma } = makeFakePrisma(
      [{ leadId: 'lead-3', type: 'LEAD_TAKEN_IN_WORK', createdAt: minutesAgo(59) }],
      [
        { leadId: 'lead-2', title: 'Задача', dueDate: minutesAgo(-60) },
        { leadId: 'lead-3', title: 'Задача', dueDate: minutesAgo(-60) },
      ],
    );

    const results = await computeRiskBatch(
      [leadWithoutResponse, leadWithResponse],
      baseSettings,
      prisma,
    );
    const byId = new Map(results.map((r) => [r.id, r]));

    expect(byId.get('lead-2')?.risk).toEqual({
      level: 'red',
      reason: 'Нет первого ответа 60 минут',
    });
    expect(byId.get('lead-3')?.risk).toEqual({ level: 'green', reason: null });
  });

  it('собирает overdueOpenTask из просроченной задачи — yellow с её названием', async () => {
    const lead = makeLead({
      id: 'lead-4',
      createdAt: isoMinutesAgo(5),
      stage: { id: 'stage-4', name: 'Этап', color: '#000000', stageTimeLimitDays: 30 },
    });
    const { prisma } = makeFakePrisma(
      [{ leadId: 'lead-4', type: 'LEAD_TAKEN_IN_WORK', createdAt: minutesAgo(4) }],
      [{ leadId: 'lead-4', title: 'Отправить КП', dueDate: minutesAgo(120) }],
    );

    const [result] = await computeRiskBatch([lead], baseSettings, prisma);
    expect(result.risk).toEqual({ level: 'yellow', reason: 'Просрочена задача: Отправить КП' });
  });

  it('лид без открытых задач — hasOpenTask=false → yellow "Нет следующего шага"', async () => {
    const lead = makeLead({
      id: 'lead-5',
      createdAt: isoMinutesAgo(5),
      stage: { id: 'stage-5', name: 'Этап', color: '#000000', stageTimeLimitDays: 30 },
    });
    const { prisma } = makeFakePrisma(
      [{ leadId: 'lead-5', type: 'LEAD_TAKEN_IN_WORK', createdAt: minutesAgo(4) }],
      [],
    );

    const [result] = await computeRiskBatch([lead], baseSettings, prisma);
    expect(result.risk).toEqual({ level: 'yellow', reason: 'Нет следующего шага' });
  });

  it('фолбэк: при отсутствии STAGE_CHANGED использует Lead.createdAt как дату начала этапа', async () => {
    const lead = makeLead({
      id: 'lead-6',
      createdAt: isoDaysAgo(10),
      stage: { id: 'stage-6', name: 'Этап', color: '#000000', stageTimeLimitDays: 5 },
    });
    const { prisma } = makeFakePrisma(
      [{ leadId: 'lead-6', type: 'LEAD_TAKEN_IN_WORK', createdAt: daysAgo(9) }],
      [],
    );

    const [result] = await computeRiskBatch([lead], baseSettings, prisma);
    expect(result.risk).toEqual({ level: 'red', reason: '10 дней на этапе' });
  });

  it('делает ровно один запрос событий и один запрос задач независимо от числа лидов (без N+1)', async () => {
    const leads = [makeLead({ id: 'lead-7' }), makeLead({ id: 'lead-8' }), makeLead({ id: 'lead-9' })];
    const { prisma, eventFindMany, taskFindMany } = makeFakePrisma(
      [{ leadId: 'lead-7', type: 'LEAD_TAKEN_IN_WORK', createdAt: minutesAgo(1) }],
      [{ leadId: 'lead-8', title: 'Задача', dueDate: minutesAgo(-60) }],
    );

    await computeRiskBatch(leads, baseSettings, prisma);

    expect(eventFindMany).toHaveBeenCalledTimes(1);
    expect(taskFindMany).toHaveBeenCalledTimes(1);
  });

  it('пустой список лидов не делает запросов к prisma и возвращает пустой массив', async () => {
    const { prisma, eventFindMany, taskFindMany } = makeFakePrisma([], []);

    const result = await computeRiskBatch([], baseSettings, prisma);

    expect(result).toEqual([]);
    expect(eventFindMany).not.toHaveBeenCalled();
    expect(taskFindMany).not.toHaveBeenCalled();
  });
});
