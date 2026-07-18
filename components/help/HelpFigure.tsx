'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Icon } from '@iconify/react';

interface HelpFigureProps {
  src: string;
  alt: string;
}

/**
 * Скриншот в документации: клик открывает изображение на весь экран (лайтбокс),
 * закрытие — по крестику, клику на фон или Escape.
 */
export default function HelpFigure({ src, alt }: HelpFigureProps): ReactNode {
  const [open, setOpen] = useState(false);

  return (
    <figure className="my-6">
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={alt ? `Увеличить изображение: ${alt}` : 'Увеличить изображение'}
        className="group relative block w-full cursor-zoom-in overflow-hidden rounded-[10px] border-[0.5px] border-[var(--color-border)] bg-transparent p-0 shadow-sm"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          loading="lazy"
          className="w-full transition-transform duration-200 group-hover:scale-[1.015]"
        />
        <span className="pointer-events-none absolute right-2.5 top-2.5 flex h-8 w-8 items-center justify-center rounded-full bg-black/45 text-white opacity-0 backdrop-blur-sm transition-opacity duration-150 group-hover:opacity-100">
          <Icon icon="lucide:maximize-2" className="h-4 w-4" aria-hidden="true" />
        </span>
      </button>

      {alt ? (
        <figcaption className="mt-2.5 text-center text-[12.5px] leading-[1.5] text-[var(--color-text-tertiary)]">
          {alt}
        </figcaption>
      ) : null}

      {open && <Lightbox src={src} alt={alt} onClose={() => setOpen(false)} />}
    </figure>
  );
}

function Lightbox({
  src,
  alt,
  onClose,
}: {
  src: string;
  alt: string;
  onClose: () => void;
}): ReactNode {
  const [visible, setVisible] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => setVisible(true));
    closeRef.current?.focus();

    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={alt || 'Просмотр изображения'}
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-8"
    >
      <button
        type="button"
        aria-label="Закрыть"
        onClick={onClose}
        className={`fixed inset-0 cursor-zoom-out bg-black/80 transition-opacity duration-150 ${
          visible ? 'opacity-100' : 'opacity-0'
        }`}
      />

      <button
        ref={closeRef}
        type="button"
        aria-label="Закрыть"
        onClick={onClose}
        className="fixed right-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 sm:right-5 sm:top-5"
      >
        <Icon icon="lucide:x" className="h-5 w-5" aria-hidden="true" />
      </button>

      <figure
        className={`relative z-[1] flex flex-col items-center transition-all duration-150 ${
          visible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}
        onClick={(event) => event.stopPropagation()}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          className="max-h-[85vh] max-w-[92vw] rounded-[8px] object-contain shadow-2xl"
        />
        {alt ? (
          <figcaption className="mt-3 max-w-[92vw] text-center text-[13px] leading-[1.5] text-white/70">
            {alt}
          </figcaption>
        ) : null}
      </figure>
    </div>
  );
}
