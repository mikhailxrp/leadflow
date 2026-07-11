'use client';

import { useState, type MouseEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { Icon } from '@iconify/react';
import type { CloseType } from '@prisma/client';
import CloseLeadMenu from '@/components/leads/CloseLeadMenu';
import EditDueDateModal from '@/components/leads/EditDueDateModal';
import IconButton from '@/components/ui/IconButton';
import AddTaskModal from '@/components/tasks/AddTaskModal';
import type { NextAction } from '@/lib/tasks/getNextActions';

interface LeadRowQuickActionsProps {
  leadId: string;
  closeType: CloseType | null;
  nextAction: NextAction;
  canEditNextAction: boolean;
  showActions: boolean;
}

type ActiveModal = 'add-task' | 'edit-due-date' | null;

export default function LeadRowQuickActions({
  leadId,
  closeType,
  nextAction,
  canEditNextAction,
  showActions,
}: LeadRowQuickActionsProps): ReactNode {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);

  const MENU_WIDTH = 220;
  const MENU_HEIGHT = 90;

  function toggleMenu(event: MouseEvent<HTMLButtonElement>): void {
    if (menuOpen) {
      setMenuOpen(false);
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const top =
      spaceBelow < MENU_HEIGHT + 8
        ? rect.top - MENU_HEIGHT - 4
        : rect.bottom + 4;
    const left = Math.max(8, rect.right - MENU_WIDTH);
    setMenuPos({ top, left });
    setMenuOpen(true);
  }

  if (!showActions || closeType !== null) {
    return null;
  }

  const canChangeDueDate = nextAction === null || canEditNextAction;

  function handleDueDateClick(): void {
    setMenuOpen(false);
    if (nextAction === null) {
      setActiveModal('add-task');
      return;
    }
    if (!canEditNextAction) return;
    setActiveModal('edit-due-date');
  }

  function handleTaskCreated(): void {
    setActiveModal(null);
    router.refresh();
  }

  function handleDueDateSaved(): void {
    setActiveModal(null);
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2">
      <CloseLeadMenu leadId={leadId} isClosed={false} />

      <div className="relative">
        <IconButton
          size="sm"
          aria-label="Быстрые действия по задаче"
          onClick={toggleMenu}
          icon={<Icon icon="tabler:clipboard-check" className="h-4 w-4" aria-hidden="true" />}
        />

        {menuOpen && menuPos &&
          createPortal(
            <>
              <button
                type="button"
                className="fixed inset-0 z-[60] cursor-default"
                aria-label="Закрыть меню"
                onClick={() => setMenuOpen(false)}
              />
              <div
                style={{ top: menuPos.top, left: menuPos.left, width: MENU_WIDTH }}
                className="
                  fixed z-[61] overflow-hidden
                  rounded-[8px] border border-[0.5px] border-[var(--color-border)]
                  bg-[var(--color-bg-surface)] shadow-lg
                "
              >
                <button
                  type="button"
                  className="
                    w-full px-4 py-2.5 text-left text-[13px]
                    text-[var(--color-text-primary)]
                    transition-colors hover:bg-[var(--color-bg-surface-2)]
                  "
                  onClick={() => {
                    setMenuOpen(false);
                    setActiveModal('add-task');
                  }}
                >
                  Поставить следующее действие
                </button>
                <button
                  type="button"
                  disabled={!canChangeDueDate}
                  className="
                    w-full px-4 py-2.5 text-left text-[13px]
                    text-[var(--color-text-primary)]
                    transition-colors hover:bg-[var(--color-bg-surface-2)]
                    disabled:cursor-not-allowed disabled:opacity-50
                    disabled:hover:bg-transparent
                  "
                  onClick={handleDueDateClick}
                >
                  Изменить срок
                </button>
              </div>
            </>,
            document.body
          )}
      </div>

      {activeModal === 'add-task' && (
        <AddTaskModal
          leadId={leadId}
          onClose={() => setActiveModal(null)}
          onCreated={handleTaskCreated}
        />
      )}

      {activeModal === 'edit-due-date' && nextAction && (
        <EditDueDateModal
          leadId={leadId}
          taskId={nextAction.taskId}
          currentDueDate={nextAction.dueDate}
          onClose={() => setActiveModal(null)}
          onSaved={handleDueDateSaved}
        />
      )}
    </div>
  );
}
