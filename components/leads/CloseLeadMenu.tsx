'use client';

import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Button from '@/components/ui/Button';
import CloseAsLostModal from '@/components/leads/CloseAsLostModal';
import CloseAsWonModal from '@/components/leads/CloseAsWonModal';

interface CloseLeadMenuProps {
  leadId: string;
  isClosed: boolean;
  size?: 'sm' | 'md';
  fullWidth?: boolean;
}

/** Ширина меню, когда оно не тянется по ширине кнопки (строка таблицы). */
const MENU_WIDTH = 190;
/** Высота двух пунктов с рамками — нужна до рендера, чтобы решить, куда раскрыть. */
const MENU_HEIGHT = 90;
const VIEWPORT_GAP = 8;

type MenuPosition = { top: number; left: number; width: number };

export default function CloseLeadMenu({
  leadId,
  isClosed,
  size = 'md',
  fullWidth = true,
}: CloseLeadMenuProps) {
  const [menuPos, setMenuPos] = useState<MenuPosition | null>(null);
  const [showLostModal, setShowLostModal] = useState(false);
  const [showWonModal, setShowWonModal] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);

  if (isClosed) {
    return null;
  }

  /**
   * Меню уходит в портал с fixed-координатами: в строке таблицы (`/leads`) оно
   * иначе обрезается контейнером `overflow-x-auto` — у последней строки вместо
   * выпадашки появлялась прокрутка. Тот же приём, что в LeadRowQuickActions.
   */
  function toggleMenu(): void {
    if (menuPos) {
      setMenuPos(null);
      return;
    }

    const anchor = anchorRef.current;
    if (!anchor) return;

    const rect = anchor.getBoundingClientRect();
    const width = fullWidth ? rect.width : MENU_WIDTH;
    const spaceBelow = window.innerHeight - rect.bottom;
    const top =
      spaceBelow < MENU_HEIGHT + VIEWPORT_GAP
        ? rect.top - MENU_HEIGHT - 4
        : rect.bottom + 4;
    const maxLeft = Math.max(VIEWPORT_GAP, window.innerWidth - width - VIEWPORT_GAP);
    const left = Math.min(Math.max(VIEWPORT_GAP, rect.left), maxLeft);

    setMenuPos({ top, left, width });
  }

  function handleWon() {
    setMenuPos(null);
    setShowWonModal(true);
  }

  function handleLost() {
    setMenuPos(null);
    setShowLostModal(true);
  }

  return (
    <div ref={anchorRef} className="flex flex-col gap-1">
      <Button
        variant="secondary"
        size={size}
        className={fullWidth ? 'w-full' : 'whitespace-nowrap'}
        onClick={toggleMenu}
      >
        Закрыть лид
      </Button>

      {menuPos &&
        createPortal(
          <>
            <button
              type="button"
              className="fixed inset-0 z-[60] cursor-default"
              aria-label="Закрыть меню"
              onClick={() => setMenuPos(null)}
            />
            <div
              style={{ top: menuPos.top, left: menuPos.left, width: menuPos.width }}
              className="
                fixed z-[61] overflow-hidden
                rounded-[8px] border border-[0.5px] border-[var(--color-border)]
                bg-[var(--color-bg-surface)] shadow-lg
              "
            >
              <button
                type="button"
                className="w-full px-4 py-2.5 text-left text-[13px] text-[var(--color-text-primary)] hover:bg-[var(--color-bg-surface-2)] transition-colors"
                onClick={handleWon}
              >
                Закрыть сделкой
              </button>
              <button
                type="button"
                className="w-full px-4 py-2.5 text-left text-[13px] text-[var(--color-badge-danger-text)] hover:bg-[var(--color-badge-danger-bg)] transition-colors"
                onClick={handleLost}
              >
                Закрыть отказом
              </button>
            </div>
          </>,
          document.body,
        )}

      {showWonModal && (
        <CloseAsWonModal leadId={leadId} onClose={() => setShowWonModal(false)} />
      )}

      {showLostModal && (
        <CloseAsLostModal leadId={leadId} onClose={() => setShowLostModal(false)} />
      )}
    </div>
  );
}
