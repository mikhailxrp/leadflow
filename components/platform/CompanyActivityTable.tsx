'use client';

import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { MobileCard, MobileCardRow } from '@/components/platform/MobileCard';
import type { CompanyActivityItem, MarketerActivityItem } from '@/types/platform';
import type { PlatformRole } from '@prisma/client';

type ActivityPeriod = 7 | 30 | 90;
type ActivityTab = 'companies' | 'marketers';

interface CompanyActivityTableProps {
  initialData: CompanyActivityItem[];
  initialMarketers?: MarketerActivityItem[];
  initialPeriod: ActivityPeriod;
  role: PlatformRole;
}

const MS_PER_DAY = 86_400_000;
const STALE_LOGIN_THRESHOLD_DAYS = 30;
const STALE_LOGIN_COLOR = '#F59E0B';

const PERIOD_OPTIONS = [
  { value: 7, label: '7 дней' },
  { value: 30, label: '30 дней' },
  { value: 90, label: '90 дней' },
] as const satisfies ReadonlyArray<{ value: ActivityPeriod; label: string }>;

type SortKey =
  | 'companyName'
  | 'lastLoginAt'
  | 'leadCount'
  | 'activeUsers'
  | 'createdAt';

type SortDirection = 'asc' | 'desc';

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(value));
}

function formatLastLogin(value: string | null): string {
  if (!value) {
    return 'Никогда';
  }

  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function isStaleLogin(lastLoginAt: string | null): boolean {
  if (!lastLoginAt) {
    return true;
  }

  const thresholdMs = STALE_LOGIN_THRESHOLD_DAYS * MS_PER_DAY;
  return Date.now() - new Date(lastLoginAt).getTime() > thresholdMs;
}

function compareValues(
  a: CompanyActivityItem,
  b: CompanyActivityItem,
  key: SortKey,
  direction: SortDirection,
): number {
  const multiplier = direction === 'asc' ? 1 : -1;

  if (key === 'companyName') {
    return multiplier * a.companyName.localeCompare(b.companyName, 'ru');
  }

  if (key === 'lastLoginAt') {
    const aTime = a.lastLoginAt ? new Date(a.lastLoginAt).getTime() : 0;
    const bTime = b.lastLoginAt ? new Date(b.lastLoginAt).getTime() : 0;
    return multiplier * (aTime - bTime);
  }

  if (key === 'leadCount') {
    return multiplier * (a.leadCount - b.leadCount);
  }

  if (key === 'activeUsers') {
    return multiplier * (a.activeUsers - b.activeUsers);
  }

  const aTime = new Date(a.createdAt).getTime();
  const bTime = new Date(b.createdAt).getTime();
  return multiplier * (aTime - bTime);
}

const SORTABLE_COLUMNS: { key: SortKey; label: string }[] = [
  { key: 'companyName', label: 'Компания' },
  { key: 'lastLoginAt', label: 'Последний вход' },
  { key: 'leadCount', label: 'Лидов за период' },
  { key: 'activeUsers', label: 'Активных пользователей' },
  { key: 'createdAt', label: 'Создана' },
];

export default function CompanyActivityTable({
  initialData,
  initialMarketers,
  initialPeriod,
  role,
}: CompanyActivityTableProps): ReactNode {
  const [data, setData] = useState<CompanyActivityItem[]>(initialData);
  const [marketers] = useState<MarketerActivityItem[]>(initialMarketers ?? []);
  const [tab, setTab] = useState<ActivityTab>('companies');
  const [period, setPeriod] = useState<ActivityPeriod>(initialPeriod);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('lastLoginAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const fetchActivity = useCallback(async (nextPeriod: ActivityPeriod) => {
    setIsLoading(true);
    setFetchError(null);

    try {
      const response = await fetch(
        `/api/platform/activity?period=${nextPeriod}`,
      );

      if (!response.ok) {
        throw new Error('Failed to fetch company activity');
      }

      const nextData = (await response.json()) as {
        companies: CompanyActivityItem[];
      };
      setData(nextData.companies);
      setPeriod(nextPeriod);
    } catch (error) {
      console.error(error);
      setFetchError('Не удалось загрузить данные активности');
    } finally {
      setIsLoading(false);
    }
  }, []);

  function handleSort(key: SortKey): void {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      return;
    }

    setSortKey(key);
    setSortDirection(key === 'companyName' ? 'asc' : 'desc');
  }

  const filteredAndSorted = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    const filtered = normalizedSearch
      ? data.filter((item) =>
          item.companyName.toLowerCase().includes(normalizedSearch),
        )
      : data;

    return [...filtered].sort((a, b) =>
      compareValues(a, b, sortKey, sortDirection),
    );
  }, [data, search, sortDirection, sortKey]);

  return (
    <main className="px-4 py-6 sm:px-6 sm:py-8">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <h1 className="text-[20px] font-medium text-[var(--color-text-primary)]">
          Активность компаний
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
            const isActive = period === option.value;

            return (
              <button
                key={option.value}
                type="button"
                disabled={isLoading}
                onClick={() => fetchActivity(option.value)}
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

      {role === 'SUPER_ADMIN' ? (
        <div
          className="
            mb-6 inline-flex rounded-[8px]
            border border-[0.5px] border-[var(--color-border)]
            bg-[var(--color-bg-surface)]
            p-1
          "
          role="tablist"
          aria-label="Раздел активности"
        >
          {(
            [
              { value: 'companies', label: 'Компании' },
              { value: 'marketers', label: 'Маркетологи' },
            ] as const satisfies ReadonlyArray<{ value: ActivityTab; label: string }>
          ).map((option) => {
            const isActive = tab === option.value;

            return (
              <button
                key={option.value}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setTab(option.value)}
                className={`
                  rounded-[6px] px-3 py-1.5
                  text-[13px] font-medium transition-colors duration-150
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
      ) : null}

      {tab === 'marketers' ? (
        marketers.length === 0 ? (
          <p className="py-12 text-center text-[14px] text-[var(--color-text-secondary)]">
            Маркетологи ещё не созданы
          </p>
        ) : (
          <>
          {/* Мобильные карточки (< lg) */}
          <div className="flex flex-col gap-3 xl:hidden">
            {marketers.map((marketer) => (
              <MobileCard key={marketer.id}>
                <div className="mb-3 flex items-start justify-between gap-2">
                  <p className="break-words text-[15px] font-medium text-[var(--color-text-primary)]">
                    {marketer.name}
                  </p>
                  <span
                    className={`inline-flex flex-shrink-0 rounded-[20px] px-2.5 py-1 text-[12px] font-medium ${
                      marketer.isActive
                        ? 'bg-[var(--color-badge-success-bg)] text-[var(--color-badge-success-text)]'
                        : 'bg-[var(--color-badge-danger-bg)] text-[var(--color-badge-danger-text)]'
                    }`}
                  >
                    {marketer.isActive ? 'Активен' : 'Заблокирован'}
                  </span>
                </div>
                <div className="flex flex-col">
                  <MobileCardRow label="Email">
                    <span className="break-all">{marketer.email}</span>
                  </MobileCardRow>
                  <MobileCardRow label="Последний вход">
                    {formatLastLogin(marketer.lastLoginAt)}
                  </MobileCardRow>
                  <MobileCardRow label="Компаний создано">
                    {marketer.companiesCreated}
                  </MobileCardRow>
                </div>
              </MobileCard>
            ))}
          </div>

          {/* Таблица (≥ lg) */}
          <div
            className="
              hidden overflow-x-auto rounded-[14px]
              border border-[0.5px] border-[var(--color-border)]
              bg-[var(--color-bg-surface)] xl:block
            "
          >
            <table className="w-full min-w-[700px] text-left">
              <thead>
                <tr className="border-b border-[0.5px] border-[var(--color-border)]">
                  {['Маркетолог', 'Email', 'Статус', 'Последний вход', 'Компаний создано'].map(
                    (header) => (
                      <th
                        key={header}
                        className="
                          whitespace-nowrap px-4 py-3
                          text-[11px] font-medium text-[var(--color-text-secondary)]
                        "
                      >
                        {header}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {marketers.map((marketer) => (
                  <tr
                    key={marketer.id}
                    className="
                      border-b border-[0.5px] border-[var(--color-border)]
                      last:border-b-0 transition-colors duration-150
                      hover:bg-[var(--color-bg-surface-2)]
                    "
                  >
                    <td className="px-4 py-3 text-[14px] text-[var(--color-text-primary)]">
                      {marketer.name}
                    </td>
                    <td className="px-4 py-3 text-[14px] text-[var(--color-text-primary)]">
                      {marketer.email}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-[20px] px-2.5 py-1 text-[12px] font-medium ${
                          marketer.isActive
                            ? 'bg-[var(--color-badge-success-bg)] text-[var(--color-badge-success-text)]'
                            : 'bg-[var(--color-badge-danger-bg)] text-[var(--color-badge-danger-text)]'
                        }`}
                      >
                        {marketer.isActive ? 'Активен' : 'Заблокирован'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[14px] text-[var(--color-text-primary)]">
                      {formatLastLogin(marketer.lastLoginAt)}
                    </td>
                    <td className="px-4 py-3 text-[14px] text-[var(--color-text-primary)]">
                      {marketer.companiesCreated}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </>
        )
      ) : (
        <>
      <div className="mb-4">
        <label htmlFor="company-search" className="sr-only">
          Поиск по названию компании
        </label>
        <input
          id="company-search"
          type="search"
          placeholder="Поиск по названию компании…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="
            h-[36px] w-full max-w-[360px] rounded-[6px]
            border border-[0.5px] border-[var(--color-border)]
            bg-[var(--color-bg-surface)] px-3
            text-[14px] text-[var(--color-text-primary)]
            outline-none transition-colors duration-150
            placeholder:text-[var(--color-text-secondary)]
            focus:border-[#10B981]
          "
        />
      </div>

      {fetchError && (
        <p className="mb-4 text-[13px] text-[#EF4444]" role="alert">
          {fetchError}
        </p>
      )}

      {filteredAndSorted.length === 0 ? (
        <p className="py-12 text-center text-[14px] text-[var(--color-text-secondary)]">
          {isLoading ? 'Загрузка…' : 'Нет данных для отображения'}
        </p>
      ) : (
        <>
          {/* Мобильные карточки (< lg) */}
          <div
            className={`flex flex-col gap-3 xl:hidden ${
              isLoading ? 'opacity-60' : ''
            }`}
          >
            {filteredAndSorted.map((item) => {
              const staleLogin = isStaleLogin(item.lastLoginAt);

              return (
                <MobileCard key={item.companyId}>
                  <p className="mb-3 break-words text-[15px] font-medium text-[var(--color-text-primary)]">
                    {item.companyName}
                  </p>
                  <div className="flex flex-col">
                    <MobileCardRow label="Последний вход">
                      <span
                        style={
                          staleLogin ? { color: STALE_LOGIN_COLOR } : undefined
                        }
                      >
                        {formatLastLogin(item.lastLoginAt)}
                      </span>
                    </MobileCardRow>
                    <MobileCardRow label="Лидов за период">
                      {item.leadCount}
                    </MobileCardRow>
                    <MobileCardRow label="Активных пользователей">
                      {item.activeUsers}
                    </MobileCardRow>
                    <MobileCardRow label="Создана">
                      {formatDate(item.createdAt)}
                    </MobileCardRow>
                  </div>
                </MobileCard>
              );
            })}
          </div>

          {/* Таблица (≥ lg) */}
          <div
            className={`
              hidden overflow-x-auto rounded-[14px]
              border border-[0.5px] border-[var(--color-border)]
              bg-[var(--color-bg-surface)] xl:block
              ${isLoading ? 'opacity-60' : ''}
            `}
          >
            <table className="w-full min-w-[900px] text-left">
            <thead>
              <tr className="border-b border-[0.5px] border-[var(--color-border)]">
                {SORTABLE_COLUMNS.map((column) => (
                  <th
                    key={column.key}
                    className="
                      whitespace-nowrap px-4 py-3
                      text-[11px] font-medium text-[var(--color-text-secondary)]
                    "
                  >
                    <button
                      type="button"
                      onClick={() => handleSort(column.key)}
                      className="
                        inline-flex items-center gap-1
                        text-left transition-colors duration-150
                        hover:text-[var(--color-text-primary)]
                      "
                    >
                      {column.label}
                      {sortKey === column.key && (
                        <span aria-hidden="true">
                          {sortDirection === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredAndSorted.map((item) => {
                const staleLogin = isStaleLogin(item.lastLoginAt);

                return (
                  <tr
                    key={item.companyId}
                    className="
                      border-b border-[0.5px] border-[var(--color-border)]
                      last:border-b-0 transition-colors duration-150
                      hover:bg-[var(--color-bg-surface-2)]
                    "
                  >
                    <td className="px-4 py-3 text-[14px] text-[var(--color-text-primary)]">
                      {item.companyName}
                    </td>
                    <td
                      className="px-4 py-3 text-[14px] text-[var(--color-text-primary)]"
                      style={staleLogin ? { color: STALE_LOGIN_COLOR } : undefined}
                    >
                      {formatLastLogin(item.lastLoginAt)}
                    </td>
                    <td className="px-4 py-3 text-[14px] text-[var(--color-text-primary)]">
                      {item.leadCount}
                    </td>
                    <td className="px-4 py-3 text-[14px] text-[var(--color-text-primary)]">
                      {item.activeUsers}
                    </td>
                    <td className="px-4 py-3 text-[14px] text-[var(--color-text-primary)]">
                      {formatDate(item.createdAt)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            </table>
          </div>
          </>
      )}
        </>
      )}
    </main>
  );
}
