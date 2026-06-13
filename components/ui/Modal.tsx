'use client';

import { useEffect, useState, type ReactNode } from 'react';

interface ModalProps {
  onClose: () => void;
  children: ReactNode;
  dialogClassName?: string;
}

export default function Modal({ onClose, children, dialogClassName = '' }: ModalProps): ReactNode {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => setIsVisible(true));

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
      setIsVisible(false);
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className={`
          fixed inset-0 cursor-pointer bg-black/40 transition-opacity duration-150
          ${isVisible ? 'opacity-100' : 'opacity-0'}
        `}
        aria-label="Закрыть"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        className={`
          relative z-10 w-full max-w-[400px] rounded-xl
          bg-[var(--color-bg-surface)] p-6
          transition-all duration-150
          ${isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}
          ${dialogClassName}
        `}
        onClick={(event) => event.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
