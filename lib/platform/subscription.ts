import 'server-only';

export const SUBSCRIPTION_EXPIRING_THRESHOLD_DAYS = 14;

import type { SubscriptionStatus } from '@/types/platform';

export type { SubscriptionStatus };

export type SubscriptionStatusResult = {
  status: SubscriptionStatus;
  daysUntilDue: number | null;
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function startOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

function calendarDaysUntil(now: Date, dueDate: Date): number {
  const today = startOfDay(now);
  const due = startOfDay(dueDate);
  return Math.round((due.getTime() - today.getTime()) / MS_PER_DAY);
}

export function getSubscriptionStatus(
  nextPaymentAt: Date | null,
  now: Date = new Date(),
): SubscriptionStatusResult {
  if (!nextPaymentAt) {
    return { status: 'none', daysUntilDue: null };
  }

  const daysUntilDue = calendarDaysUntil(now, nextPaymentAt);

  if (daysUntilDue < 0) {
    return { status: 'overdue', daysUntilDue };
  }

  if (daysUntilDue <= SUBSCRIPTION_EXPIRING_THRESHOLD_DAYS) {
    return { status: 'expiring', daysUntilDue };
  }

  return { status: 'ok', daysUntilDue };
}
