'use client';

import { useEffect, useRef, useState } from 'react';
import { Icon } from '@iconify/react';
import Button from '@/components/ui/Button';
import RollbackConfirmModal from '@/components/import/RollbackConfirmModal';
import type { ImportHistoryItem } from '@/types/import';

const STATUS_LABELS: Record<ImportHistoryItem['status'], string> = {
  PROCESSING: 'Обрабатывается',
  DONE: 'Завершён',
  ROLLED_BACK: 'Откачен',
};

interface ImportHistoryTableProps {
  initialHistory: ImportHistoryItem[];
  refreshSignal: number;
}

export default function ImportHistoryTable({
  initialHistory,
  refreshSignal,
}: ImportHistoryTableProps) {
  const [items, setItems] = useState<ImportHistoryItem[]>(initialHistory);
  const [rollbackTarget, setRollbackTarget] = useState<ImportHistoryItem | null>(null);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    fetch('/api/import')
      .then((res) => (res.ok ? (res.json() as Promise<ImportHistoryItem[]>) : null))
      .then((data) => {
        if (data) setItems(data);
      })
      .catch(() => {});
  }, [refreshSignal]);

  function handleRollbackSuccess(batchId: string): void {
    setItems((prev) =>
      prev.map((item) => (item.id === batchId ? { ...item, status: 'ROLLED_BACK' } : item)),
    );
    setRollbackTarget(null);
  }

  if (items.length === 0) {
    return (
      <p className="rounded-[8px] border-[0.5px] border-[var(--color-border)] px-4 py-6 text-center text-[13px] text-[var(--color-text-secondary)]">
        Импортов пока не было
      </p>
    );
  }

  return (
    <>
      <div className="overflow-x-auto rounded-[8px] border-[0.5px] border-[var(--color-border)]">
        <table className="w-full text-left text-[13px]">
          <thead>
            <tr className="border-b-[0.5px] border-[var(--color-border)] bg-[var(--color-bg-surface-2)]">
              <th className="px-4 py-2 font-medium text-[var(--color-text-secondary)]">Файл</th>
              <th className="px-4 py-2 font-medium text-[var(--color-text-secondary)]">Дата</th>
              <th className="px-4 py-2 font-medium text-[var(--color-text-secondary)]">Автор</th>
              <th className="px-4 py-2 font-medium text-[var(--color-text-secondary)]">Статус</th>
              <th className="px-4 py-2 font-medium text-[var(--color-text-secondary)]">Загружено</th>
              <th className="px-4 py-2 font-medium text-[var(--color-text-secondary)]">Дублей</th>
              <th className="px-4 py-2 font-medium text-[var(--color-text-secondary)]">Ошибок</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr
                key={item.id}
                className="border-b-[0.5px] border-[var(--color-border)] last:border-0"
              >
                <td className="px-4 py-2 text-[var(--color-text-primary)]">{item.fileName}</td>
                <td className="px-4 py-2 text-[var(--color-text-secondary)]">
                  {new Date(item.createdAt).toLocaleString('ru-RU')}
                </td>
                <td className="px-4 py-2 text-[var(--color-text-secondary)]">
                  {item.createdByName ?? '—'}
                </td>
                <td className="px-4 py-2 text-[var(--color-text-secondary)]">
                  {STATUS_LABELS[item.status]}
                </td>
                <td className="px-4 py-2 text-[var(--color-text-secondary)]">{item.imported}</td>
                <td className="px-4 py-2 text-[var(--color-text-secondary)]">{item.duplicates}</td>
                <td className="px-4 py-2 text-[var(--color-text-secondary)]">{item.errors}</td>
                <td className="px-4 py-2 text-right">
                  {item.status === 'DONE' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      type="button"
                      className="text-[#DC2626]"
                      onClick={() => setRollbackTarget(item)}
                      icon={<Icon icon="lucide:undo-2" className="h-4 w-4" />}
                    >
                      Откатить
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {rollbackTarget && (
        <RollbackConfirmModal
          batch={rollbackTarget}
          onClose={() => setRollbackTarget(null)}
          onSuccess={handleRollbackSuccess}
        />
      )}
    </>
  );
}
