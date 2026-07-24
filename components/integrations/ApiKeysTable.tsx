'use client';

import { Icon } from '@iconify/react';
import { useRouter } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import Button from '@/components/ui/Button';
import IconButton from '@/components/ui/IconButton';
import Toast from '@/components/ui/Toast';
import CreateApiKeyModal, { type CreatedApiKey } from '@/components/integrations/CreateApiKeyModal';
import SourceHealthIndicator from '@/components/integrations/SourceHealthIndicator';
import Toggle from '@/components/settings/Toggle';
import { SOURCE_HEALTH_LABELS } from '@/constants/integrations';
import type { SourceHealthEntry } from '@/lib/integrations/getSourceHealth';

export interface ApiKeyRow {
  id: string;
  name: string;
  sourceLabel: string;
  mask: string;
  isEnabled: boolean;
  createdAt: string;
}

interface ApiKeysTableProps {
  initialApiKeys: ApiKeyRow[];
  sourceHealth: SourceHealthEntry[];
}

function PlusIcon(): ReactNode {
  return (
    <svg
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  );
}

export default function ApiKeysTable({
  initialApiKeys,
  sourceHealth,
}: ApiKeysTableProps): ReactNode {
  const router = useRouter();
  const [apiKeys, setApiKeys] = useState<ApiKeyRow[]>(initialApiKeys);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  function handleCreated(key: CreatedApiKey): void {
    setApiKeys((prev) => [key, ...prev]);
  }

  function handleDeleteRequest(id: string): void {
    setPendingDeleteId(id);
  }

  function handleDeleteCancel(): void {
    setPendingDeleteId(null);
  }

  async function handleDeleteConfirm(id: string): Promise<void> {
    const snapshot = apiKeys;
    setPendingDeleteId(null);
    setApiKeys((prev) => prev.filter((key) => key.id !== id));

    try {
      const response = await fetch(`/api/api-keys/${id}`, { method: 'DELETE' });
      if (!response.ok) {
        setApiKeys(snapshot);
        setToast('Не удалось удалить ключ');
        return;
      }
      router.refresh();
    } catch (error) {
      console.error('Failed to delete API key:', error);
      setApiKeys(snapshot);
      setToast('Не удалось удалить ключ');
    }
  }

  function findHealth(sourceLabel: string): SourceHealthEntry | undefined {
    return sourceHealth.find((entry) => entry.type === 'api' && entry.label === sourceLabel);
  }

  async function handleToggleEnabled(row: ApiKeyRow, next: boolean): Promise<void> {
    const snapshot = apiKeys;
    setApiKeys((prev) => prev.map((key) => (key.id === row.id ? { ...key, isEnabled: next } : key)));

    try {
      const response = await fetch(`/api/api-keys/${row.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isEnabled: next }),
      });

      if (!response.ok) {
        setApiKeys(snapshot);
        setToast(`Не удалось изменить статус ключа «${row.name}»`);
      }
    } catch (error) {
      console.error('Failed to toggle API key:', error);
      setApiKeys(snapshot);
      setToast(`Не удалось изменить статус ключа «${row.name}»`);
    }
  }

  return (
    <div>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[720px] text-left">
          <thead>
            <tr className="border-b border-[var(--color-border)] border-[0.5px]">
              {['Название', 'Источник', 'Ключ', 'Здоровье', 'Включён', 'Создан', 'Действия'].map((header) => (
                <th
                  key={header}
                  className="
                    whitespace-nowrap px-3 py-2
                    text-[12px] font-medium text-[var(--color-text-secondary)]
                  "
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {apiKeys.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-3 py-8 text-center text-[14px] text-[var(--color-text-secondary)]"
                >
                  Нет API-ключей
                </td>
              </tr>
            ) : (
              apiKeys.map((row) => {
                const health = findHealth(row.sourceLabel);
                const isPendingDelete = pendingDeleteId === row.id;

                return (
                  <tr
                    key={row.id}
                    className="border-b border-[var(--color-border)] border-[0.5px] last:border-0"
                  >
                    <td className="whitespace-nowrap px-3 py-3 text-[13px] font-medium text-[var(--color-text-primary)]">
                      {row.name}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-[13px] text-[var(--color-text-secondary)]">
                      {row.sourceLabel}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 font-mono text-[13px] text-[var(--color-text-secondary)]">
                      {row.isEnabled ? row.mask : '—'}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3">
                      {!row.isEnabled ? (
                        <p className="flex items-center gap-1.5 text-[12px] text-[var(--color-text-secondary)]">
                          <span aria-hidden="true">{SOURCE_HEALTH_LABELS.disabled.emoji}</span>
                          <span>{SOURCE_HEALTH_LABELS.disabled.label}</span>
                        </p>
                      ) : health ? (
                        <SourceHealthIndicator
                          status={health.status}
                          hoursSinceLastUse={health.hoursSinceLastUse}
                          thresholdHours={health.thresholdHours}
                        />
                      ) : (
                        <span className="text-[12px] text-[var(--color-text-tertiary)]">—</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3">
                      <Toggle
                        checked={row.isEnabled}
                        onChange={(next) => handleToggleEnabled(row, next)}
                        aria-label={`Ключ «${row.name}»: ${row.isEnabled ? 'включён' : 'выключен'}`}
                      />
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-[13px] text-[var(--color-text-secondary)]">
                      {new Date(row.createdAt).toLocaleDateString('ru-RU')}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3">
                      {isPendingDelete ? (
                        <div className="flex items-center gap-2">
                          <span className="text-[12px] text-[var(--color-text-secondary)]">
                            Удалить?
                          </span>
                          <button
                            type="button"
                            className="text-[12px] font-medium text-[#DC2626] hover:underline"
                            onClick={() => handleDeleteConfirm(row.id)}
                          >
                            Да
                          </button>
                          <button
                            type="button"
                            className="text-[12px] text-[var(--color-text-secondary)] hover:underline"
                            onClick={handleDeleteCancel}
                          >
                            Нет
                          </button>
                        </div>
                      ) : (
                        <IconButton
                          className="hover:text-[#DC2626]"
                          aria-label={`Удалить ключ «${row.name}»`}
                          onClick={() => handleDeleteRequest(row.id)}
                          icon={<Icon icon="lucide:trash-2" className="h-4 w-4" />}
                        />
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Мобильная раскладка — карточки вместо таблицы, чтобы не было горизонтального скролла */}
      <div className="flex flex-col gap-3 md:hidden">
        {apiKeys.length === 0 ? (
          <p className="rounded-[8px] border border-[var(--color-border)] border-[0.5px] px-3 py-8 text-center text-[14px] text-[var(--color-text-secondary)]">
            Нет API-ключей
          </p>
        ) : (
          apiKeys.map((row) => {
            const health = findHealth(row.sourceLabel);
            const isPendingDelete = pendingDeleteId === row.id;

            return (
              <div
                key={row.id}
                className="flex flex-col gap-3 rounded-[8px] border border-[var(--color-border)] border-[0.5px] p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-medium text-[var(--color-text-primary)]">
                      {row.name}
                    </p>
                    <p className="text-[12px] text-[var(--color-text-secondary)]">
                      {row.sourceLabel}
                    </p>
                  </div>
                  <Toggle
                    checked={row.isEnabled}
                    onChange={(next) => handleToggleEnabled(row, next)}
                    aria-label={`Ключ «${row.name}»: ${row.isEnabled ? 'включён' : 'выключен'}`}
                  />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                  <span className="font-mono text-[13px] text-[var(--color-text-secondary)]">
                    {row.isEnabled ? row.mask : '—'}
                  </span>
                  {!row.isEnabled ? (
                    <p className="flex items-center gap-1.5 text-[12px] text-[var(--color-text-secondary)]">
                      <span aria-hidden="true">{SOURCE_HEALTH_LABELS.disabled.emoji}</span>
                      <span>{SOURCE_HEALTH_LABELS.disabled.label}</span>
                    </p>
                  ) : health ? (
                    <SourceHealthIndicator
                      status={health.status}
                      hoursSinceLastUse={health.hoursSinceLastUse}
                      thresholdHours={health.thresholdHours}
                    />
                  ) : (
                    <span className="text-[12px] text-[var(--color-text-tertiary)]">—</span>
                  )}
                </div>

                <div className="flex items-center justify-between border-t border-[var(--color-border)] border-[0.5px] pt-3 text-[12px] text-[var(--color-text-secondary)]">
                  <span>Создан {new Date(row.createdAt).toLocaleDateString('ru-RU')}</span>
                  {isPendingDelete ? (
                    <div className="flex items-center gap-2">
                      <span className="text-[12px] text-[var(--color-text-secondary)]">
                        Удалить?
                      </span>
                      <button
                        type="button"
                        className="text-[12px] font-medium text-[#DC2626] hover:underline"
                        onClick={() => handleDeleteConfirm(row.id)}
                      >
                        Да
                      </button>
                      <button
                        type="button"
                        className="text-[12px] text-[var(--color-text-secondary)] hover:underline"
                        onClick={handleDeleteCancel}
                      >
                        Нет
                      </button>
                    </div>
                  ) : (
                    <IconButton
                      className="hover:text-[#DC2626]"
                      aria-label={`Удалить ключ «${row.name}»`}
                      onClick={() => handleDeleteRequest(row.id)}
                      icon={<Icon icon="lucide:trash-2" className="h-4 w-4" />}
                    />
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      <Button
        type="button"
        variant="secondary"
        size="md"
        icon={<PlusIcon />}
        className="mt-4"
        onClick={() => setIsCreateOpen(true)}
      >
        Создать новый ключ
      </Button>

      {isCreateOpen && (
        <CreateApiKeyModal onClose={() => setIsCreateOpen(false)} onCreated={handleCreated} />
      )}

      {toast && <Toast title={toast} onClose={() => setToast(null)} />}
    </div>
  );
}
