import type { UserRole } from '@prisma/client';

export type ControlPeriodDays = 7 | 30 | 90;

export type ManagerStat = {
  managerId: string;
  managerName: string;
  role: UserRole;
  isBlocked: boolean;
  received: number;
  processedOnTime: number;
  stuck: number;
  wonCount: number;
  lostCount: number;
  lostWithoutReason: number;
};

export type ControlStatsResponse = {
  managers: ManagerStat[];
  periodDays: ControlPeriodDays;
};
