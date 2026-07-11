import { describe, expect, it } from 'vitest';
import { resolveApplicableNorm } from '@/lib/risk/resolveApplicableNorm';
import type { ReactionNorms, RiskInput } from '@/lib/risk/computeRisk';

type LeadInput = Pick<RiskInput['lead'], 'assignedToId' | 'stageId' | 'source'>;

const baseLead: LeadInput = {
  assignedToId: 'user-1',
  stageId: 'stage-1',
  source: 'tilda',
};

const baseNorms: ReactionNorms = {
  defaultMinutes: 30,
  reminderBeforePercent: 66,
  escalateAfterPercent: 133,
  workHoursOnly: false,
};

describe('resolveApplicableNorm', () => {
  it('byUser выигрывает, даже если заданы byStage/bySource', () => {
    const result = resolveApplicableNorm(baseLead, {
      ...baseNorms,
      byUser: { 'user-1': 10 },
      byStage: { 'stage-1': 20 },
      bySource: { tilda: 40 },
    });
    expect(result.defaultMinutes).toBe(10);
  });

  it('byStage выигрывает, когда нет переопределения по сотруднику', () => {
    const result = resolveApplicableNorm(baseLead, {
      ...baseNorms,
      byStage: { 'stage-1': 20 },
      bySource: { tilda: 40 },
    });
    expect(result.defaultMinutes).toBe(20);
  });

  it('bySource выигрывает, когда нет переопределения по сотруднику и этапу', () => {
    const result = resolveApplicableNorm(baseLead, {
      ...baseNorms,
      bySource: { tilda: 40 },
    });
    expect(result.defaultMinutes).toBe(40);
  });

  it('defaultMinutes используется, когда нет ни одного переопределения', () => {
    const result = resolveApplicableNorm(baseLead, { ...baseNorms, defaultMinutes: 45 });
    expect(result.defaultMinutes).toBe(45);
  });

  it('assignedToId = null пропускает byUser даже если карта покрывает других пользователей', () => {
    const result = resolveApplicableNorm(
      { ...baseLead, assignedToId: null },
      {
        ...baseNorms,
        byUser: { 'user-1': 10 },
        byStage: { 'stage-1': 20 },
      },
    );
    expect(result.defaultMinutes).toBe(20);
  });

  it('assignedToId задан, но отсутствует в byUser — переходит к byStage/bySource/default', () => {
    const result = resolveApplicableNorm(
      { ...baseLead, assignedToId: 'user-2' },
      { ...baseNorms, byUser: { 'user-1': 10 }, bySource: { tilda: 40 } },
    );
    expect(result.defaultMinutes).toBe(40);
  });

  it('пробрасывает reminderBeforePercent и workHoursOnly без изменений', () => {
    const result = resolveApplicableNorm(baseLead, {
      ...baseNorms,
      reminderBeforePercent: 80,
      workHoursOnly: true,
    });
    expect(result.reminderBeforePercent).toBe(80);
    expect(result.workHoursOnly).toBe(true);
  });

  it('пробрасывает escalateAfterPercent без изменений', () => {
    const result = resolveApplicableNorm(baseLead, {
      ...baseNorms,
      escalateAfterPercent: 150,
    });
    expect(result.escalateAfterPercent).toBe(150);
  });
});
