'use client';

import { Icon } from '@iconify/react';
import { useState, type ReactNode } from 'react';
import Button from '@/components/ui/Button';
import IconButton from '@/components/ui/IconButton';

interface ApiKeyRow {
  id: string;
  name: string;
  source: string;
  key: string;
  created: string;
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

export default function ApiKeysTable(): ReactNode {
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());
  const [apiKeys] = useState<ApiKeyRow[]>([]);

  function handleToggleVisibility(id: string): void {
    // TODO: показ полного ключа через API (одноразовый reveal)
    setVisibleKeys((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function handleDelete(id: string): void {
    // TODO: удаление ключа через API
    void id;
  }

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left">
          <thead>
            <tr className="border-b border-[var(--color-border)] border-[0.5px]">
              {['Название', 'Источник', 'Ключ', 'Создан', 'Действия'].map((header) => (
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
                  colSpan={5}
                  className="px-3 py-8 text-center text-[14px] text-[var(--color-text-secondary)]"
                >
                  Нет API-ключей
                </td>
              </tr>
            ) : (
              apiKeys.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-[var(--color-border)] border-[0.5px] last:border-0"
                >
                  <td className="whitespace-nowrap px-3 py-3 text-[13px] font-medium text-[var(--color-text-primary)]">
                    {row.name}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-[13px] text-[var(--color-text-secondary)]">
                    {row.source}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 font-mono text-[13px] text-[var(--color-text-secondary)]">
                    {visibleKeys.has(row.id) ? row.key : '••••••••••••'}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-[13px] text-[var(--color-text-secondary)]">
                    {row.created}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3">
                    <div className="flex items-center gap-1">
                      <IconButton
                        aria-label={`Показать ключ «${row.name}»`}
                        onClick={() => handleToggleVisibility(row.id)}
                        icon={<Icon icon="lucide:eye" className="h-4 w-4" />}
                      />
                      <IconButton
                        className="hover:text-[#DC2626]"
                        aria-label={`Удалить ключ «${row.name}»`}
                        onClick={() => handleDelete(row.id)}
                        icon={<Icon icon="lucide:trash-2" className="h-4 w-4" />}
                      />
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Button
        type="button"
        variant="secondary"
        size="md"
        icon={<PlusIcon />}
        className="mt-4"
      >
        Создать новый ключ
      </Button>
    </div>
  );
}
