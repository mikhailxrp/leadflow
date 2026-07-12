'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import CloseAsLostModal from '@/components/leads/CloseAsLostModal';

interface CloseLeadMenuProps {
  leadId: string;
  isClosed: boolean;
  size?: 'sm' | 'md';
  fullWidth?: boolean;
}

export default function CloseLeadMenu({
  leadId,
  isClosed,
  size = 'md',
  fullWidth = true,
}: CloseLeadMenuProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [showLostModal, setShowLostModal] = useState(false);
  const [closing, setClosing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  if (isClosed) {
    return null;
  }

  async function handleWon() {
    setOpen(false);
    setClosing(true);
    setError(null);
    try {
      const res = await fetch(`/api/leads/${leadId}/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ closeType: 'WON' }),
      });
      if (!res.ok) {
        setError('Не удалось закрыть лид');
        return;
      }
      router.refresh();
    } catch {
      setError('Ошибка сети');
    } finally {
      setClosing(false);
    }
  }

  function handleLost() {
    setOpen(false);
    setShowLostModal(true);
  }

  return (
    <div ref={menuRef} className="relative flex flex-col gap-1">
      <Button
        variant="secondary"
        size={size}
        className={fullWidth ? 'w-full' : 'whitespace-nowrap'}
        disabled={closing}
        onClick={() => setOpen((v) => !v)}
      >
        {closing ? 'Закрытие...' : 'Закрыть лид'}
      </Button>

      {error && (
        <span className="text-[11px] text-[var(--color-badge-danger-text)]">{error}</span>
      )}

      {open && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setOpen(false)}
          />
          <div
            className={`
              absolute top-full z-20 mt-1 overflow-hidden
              rounded-[8px] border border-[0.5px] border-[var(--color-border)]
              bg-[var(--color-bg-surface)] shadow-lg
              ${fullWidth ? 'left-0 right-0' : 'left-0 w-[190px]'}
            `}
          >
            <button
              className="w-full px-4 py-2.5 text-left text-[13px] text-[var(--color-text-primary)] hover:bg-[var(--color-bg-surface-2)] transition-colors"
              onClick={handleWon}
            >
              Закрыть сделкой
            </button>
            <button
              className="w-full px-4 py-2.5 text-left text-[13px] text-[var(--color-badge-danger-text)] hover:bg-[var(--color-badge-danger-bg)] transition-colors"
              onClick={handleLost}
            >
              Закрыть отказом
            </button>
          </div>
        </>
      )}

      {showLostModal && (
        <CloseAsLostModal leadId={leadId} onClose={() => setShowLostModal(false)} />
      )}
    </div>
  );
}
