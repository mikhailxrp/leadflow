'use client';

import { type ReactNode } from 'react';
import { Icon } from '@iconify/react';

/**
 * Печать через браузер (window.print()) с отдельными print-стилями
 * (app/globals.css → @media print) — без сторонних PDF-библиотек. Пользователь
 * выбирает «Сохранить как PDF» в системном диалоге печати.
 */
export default function DownloadPdfButton(): ReactNode {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="
        print:hidden
        inline-flex flex-shrink-0 items-center gap-1.5 rounded-[8px]
        border-[0.5px] border-[var(--color-border)] px-3 py-1.5
        text-[13px] font-medium text-[var(--color-text-primary)]
        transition-colors hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]
      "
    >
      <Icon icon="lucide:download" className="h-3.5 w-3.5" aria-hidden="true" />
      Скачать PDF
    </button>
  );
}
