import { describe, expect, it } from 'vitest';
import { computeRisk, type RiskInput } from '@/lib/risk/computeRisk';

const NOW = new Date('2026-07-11T12:00:00.000Z');
const MS_PER_MINUTE = 60_000;
const MS_PER_DAY = 86_400_000;

function minutesAgo(minutes: number): Date {
  return new Date(NOW.getTime() - minutes * MS_PER_MINUTE);
}

function daysAgo(days: number): Date {
  return new Date(NOW.getTime() - days * MS_PER_DAY);
}

type InputOverrides = {
  closeType?: RiskInput['lead']['closeType'];
  assignedToId?: string | null;
  createdAt?: Date;
  hasTakenInWork?: boolean;
  lastStageChangedAt?: Date;
  stageTimeLimitDays?: number | null;
  stageStuckDaysDefault?: number;
  defaultMinutes?: number;
  reminderBeforePercent?: number;
  hasOpenTask?: boolean;
  overdueOpenTask?: { title: string } | null;
};

function buildInput(overrides: InputOverrides = {}): RiskInput {
  return {
    lead: {
      id: 'lead-1',
      closeType: overrides.closeType ?? null,
      assignedToId:
        overrides.assignedToId === undefined ? 'user-1' : overrides.assignedToId,
      createdAt: overrides.createdAt ?? minutesAgo(10),
      source: 'tilda',
      stageId: 'stage-1',
    },
    hasTakenInWork: overrides.hasTakenInWork ?? true,
    lastStageChangedAt: overrides.lastStageChangedAt ?? daysAgo(1),
    currentStage: {
      stageTimeLimitDays:
        overrides.stageTimeLimitDays === undefined ? null : overrides.stageTimeLimitDays,
    },
    companySettings: {
      stageStuckDaysDefault: overrides.stageStuckDaysDefault ?? 5,
      reactionNorms: {
        defaultMinutes: overrides.defaultMinutes ?? 30,
        reminderBeforePercent: overrides.reminderBeforePercent ?? 66,
        escalateAfterPercent: 133,
        workHoursOnly: false,
      },
    },
    hasOpenTask: overrides.hasOpenTask ?? true,
    overdueOpenTask:
      overrides.overdueOpenTask === undefined ? null : overrides.overdueOpenTask,
    now: NOW,
  };
}

describe('computeRisk', () => {
  it('green: лид в норме — нет причины риска', () => {
    const result = computeRisk(buildInput());
    expect(result).toEqual({ level: 'green', reason: null, reasonCode: 'NONE' });
  });

  it('grey: закрыт сделкой (WON) — высший приоритет, выигрывает у "нет ответственного"', () => {
    const result = computeRisk(
      buildInput({ closeType: 'WON', assignedToId: null, hasOpenTask: false }),
    );
    expect(result).toEqual({ level: 'grey', reason: 'Закрыт: сделка', reasonCode: 'CLOSED' });
  });

  it('grey: закрыт отказом (LOST)', () => {
    const result = computeRisk(buildInput({ closeType: 'LOST' }));
    expect(result).toEqual({ level: 'grey', reason: 'Закрыт: отказ', reasonCode: 'CLOSED' });
  });

  it('red: нет ответственного', () => {
    const result = computeRisk(buildInput({ assignedToId: null }));
    expect(result).toEqual({
      level: 'red',
      reason: 'Нет ответственного',
      reasonCode: 'NO_ASSIGNEE',
    });
  });

  it('red: "нет ответственного" выигрывает у "нет следующего шага" при совпадении', () => {
    const result = computeRisk(buildInput({ assignedToId: null, hasOpenTask: false }));
    expect(result).toEqual({
      level: 'red',
      reason: 'Нет ответственного',
      reasonCode: 'NO_ASSIGNEE',
    });
  });

  it('red: нет первого ответа дольше норматива', () => {
    const result = computeRisk(
      buildInput({ hasTakenInWork: false, defaultMinutes: 30, createdAt: minutesAgo(31) }),
    );
    expect(result).toEqual({
      level: 'red',
      reason: 'Нет первого ответа 31 минут',
      reasonCode: 'NO_FIRST_RESPONSE',
    });
  });

  it('граница: ровно на нормативе первого ответа — ещё не red (строгое >)', () => {
    const result = computeRisk(
      buildInput({
        hasTakenInWork: false,
        defaultMinutes: 30,
        reminderBeforePercent: 66,
        createdAt: minutesAgo(30),
      }),
    );
    expect(result.level).not.toBe('red');
  });

  it('yellow: приближается срок первого ответа (66–100% норматива)', () => {
    const result = computeRisk(
      buildInput({
        hasTakenInWork: false,
        defaultMinutes: 100,
        reminderBeforePercent: 50,
        createdAt: minutesAgo(60),
      }),
    );
    expect(result).toEqual({
      level: 'yellow',
      reason: 'Приближается срок первого ответа',
      reasonCode: 'APPROACHING_DEADLINE',
    });
  });

  it('red: лид завис на этапе дольше дефолта компании (лимит этапа не задан)', () => {
    const result = computeRisk(
      buildInput({
        stageTimeLimitDays: null,
        stageStuckDaysDefault: 5,
        lastStageChangedAt: daysAgo(6),
      }),
    );
    expect(result).toEqual({ level: 'red', reason: '6 дней на этапе', reasonCode: 'STAGE_STUCK' });
  });

  it('red: лид завис на этапе дольше собственного лимита этапа (переопределяет дефолт компании)', () => {
    const result = computeRisk(
      buildInput({
        stageTimeLimitDays: 3,
        stageStuckDaysDefault: 30,
        lastStageChangedAt: daysAgo(4),
      }),
    );
    expect(result).toEqual({ level: 'red', reason: '4 дней на этапе', reasonCode: 'STAGE_STUCK' });
  });

  it('граница: ровно на лимите этапа — ещё не red (строгое >)', () => {
    const result = computeRisk(
      buildInput({ stageTimeLimitDays: 5, lastStageChangedAt: daysAgo(5) }),
    );
    expect(result).toEqual({ level: 'green', reason: null, reasonCode: 'NONE' });
  });

  it('yellow: просрочена открытая задача', () => {
    const result = computeRisk(buildInput({ overdueOpenTask: { title: 'Позвонить клиенту' } }));
    expect(result).toEqual({
      level: 'yellow',
      reason: 'Просрочена задача: Позвонить клиенту',
      reasonCode: 'TASK_OVERDUE',
    });
  });

  it('yellow: просроченная задача проверяется раньше "нет следующего шага" (порядок в коде)', () => {
    const result = computeRisk(
      buildInput({ overdueOpenTask: { title: 'Написать письмо' }, hasOpenTask: false }),
    );
    expect(result).toEqual({
      level: 'yellow',
      reason: 'Просрочена задача: Написать письмо',
      reasonCode: 'TASK_OVERDUE',
    });
  });

  it('yellow: нет следующего шага (открытой задачи)', () => {
    const result = computeRisk(buildInput({ hasOpenTask: false }));
    expect(result).toEqual({
      level: 'yellow',
      reason: 'Нет следующего шага',
      reasonCode: 'NO_NEXT_ACTION',
    });
  });
});
