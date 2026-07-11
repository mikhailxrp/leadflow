'use client';

import { useCallback, useState, type ReactNode } from 'react';
import type { ControlPeriodDays, ControlStatsResponse, ManagerStat } from '@/types/control';
import type { UserRole } from '@prisma/client';

interface ManagerStatsTableProps {
  initialData: ManagerStat[];
  initialPeriodDays: ControlPeriodDays;
}

const PERIOD_OPTIONS = [
  { value: 7, label: '7 дней' },
  { value: 30, label: '30 дней' },
  { value: 90, label: '90 дней' },
] as const satisfies ReadonlyArray<{ value: ControlPeriodDays; label: string }>;

const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: 'Администратор',
  HEAD: 'Руководитель',
  MANAGER: 'Менеджер',
};

const TABLE_COLUMNS = [
  'Сотрудник',
  'Получено',
  'Обработано в срок',
  'Зависло',
  'Закрыто сделкой',
  'Закрыто отказом',
  'Закрыто без причины',
] as const;

export default function ManagerStatsTable({
  initialData,
  initialPeriodDays,
}: ManagerStatsTableProps): ReactNode {
  const [managers, setManagers] = useState<ManagerStat[]>(initialData);
  const [periodDays, setPeriodDays] = useState<ControlPeriodDays>(initialPeriodDays);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const fetchStats = useCallback(async (nextPeriod: ControlPeriodDays) => {
    setIsLoading(true);
    setFetchError(null);

    try {
      const response = await fetch(`/api/control/stats?period=${nextPeriod}`);

      if (!response.ok) {
        throw new Error('Failed to fetch control stats');
      }

      const data = (await response.json()) as ControlStatsResponse;
      setManagers(data.managers);
      setPeriodDays(nextPeriod);
    } catch (error) {
      console.error(error);
      setFetchError('Не удалось загрузить данные активности');
    } finally {
      setIsLoading(false);
    }
  }, []);

  return (
    <>
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <h1 className="text-[28px] font-medium tracking-[-0.01em] text-[var(--color-text-primary)]">
          Контроль
        </h1>

        <div
          className="
            inline-flex rounded-[8px]
            border border-[0.5px] border-[var(--color-border)]
            bg-[var(--color-bg-surface)]
            p-1
          "
          role="group"
          aria-label="Период"
        >
          {PERIOD_OPTIONS.map((option) => {
            const isActive = periodDays === option.value;

            return (
              <button
                key={option.value}
                type="button"
                disabled={isLoading}
                onClick={() => fetchStats(option.value)}
                className={`
                  rounded-[6px] px-3 py-1.5
                  text-[13px] font-medium transition-colors duration-150
                  disabled:cursor-not-allowed disabled:opacity-60
                  ${
                    isActive
                      ? 'bg-[#10B981] text-white'
                      : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-surface-2)]'
                  }
                `}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      {fetchError && (
        <p className="mb-4 text-[13px] text-[#EF4444]" role="alert">
          {fetchError}
        </p>
      )}

      <div
        className={`
          overflow-hidden rounded-lg border-[0.5px] border-[var(--color-border)]
          bg-[var(--color-bg-surface)]
          ${isLoading ? 'opacity-60' : ''}
        `}
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse">
            <thead>
              <tr className="border-b-[0.5px] border-[var(--color-border)]">
                {TABLE_COLUMNS.map((column) => (
                  <th
                    key={column}
                    className="whitespace-nowrap px-4 py-3 text-left text-[11px] font-medium tracking-[0.05em] text-[var(--color-text-secondary)] uppercase"
                  >
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {managers.length === 0 ? (
                <tr>
                  <td
                    colSpan={TABLE_COLUMNS.length}
                    className="px-4 py-8 text-center text-[14px] text-[var(--color-text-secondary)]"
                  >
                    {isLoading ? 'Загрузка…' : 'За выбранный период нет назначенных лидов'}
                  </td>
                </tr>
              ) : (
                managers.map((manager) => (
                  <tr
                    key={manager.managerId}
                    className="
                      border-b-[0.5px] border-[var(--color-border)]
                      last:border-0 transition-colors duration-150
                      hover:bg-[var(--color-bg-surface-2)]
                    "
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-[14px] font-medium text-[var(--color-text-primary)]">
                          {manager.managerName}
                        </span>
                        <span className="text-[12px] text-[var(--color-text-secondary)]">
                          {ROLE_LABELS[manager.role]}
                        </span>
                        {manager.isBlocked && (
                          <span className="inline-flex rounded-[20px] bg-[var(--color-badge-danger-bg)] px-2 py-0.5 text-[11px] font-medium text-[var(--color-badge-danger-text)]">
                            Заблокирован
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[14px] text-[var(--color-text-primary)]">
                      {manager.received}
                    </td>
                    <td className="px-4 py-3 text-[14px] text-[var(--color-text-primary)]">
                      {manager.processedOnTime}
                    </td>
                    <td className="px-4 py-3 text-[14px] text-[var(--color-text-primary)]">
                      {manager.stuck}
                    </td>
                    <td className="px-4 py-3 text-[14px] text-[var(--color-text-primary)]">
                      {manager.wonCount}
                    </td>
                    <td className="px-4 py-3 text-[14px] text-[var(--color-text-primary)]">
                      {manager.lostCount}
                    </td>
                    <td className="px-4 py-3 text-[14px] text-[var(--color-text-primary)]">
                      {manager.lostWithoutReason}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
