'use client';

import { useCallback, useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import { Icon } from '@iconify/react';
import Button from '@/components/ui/Button';
import type { ImportPreviewParseResult } from '@/types/import';

/** Mirrors lib/import/parseFile.ts — duplicated so the client bundle doesn't pull in xlsx/papaparse. */
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const ACCEPTED_EXTENSIONS = ['csv', 'xlsx', 'xls'];

const PARSE_ERROR_MESSAGES: Record<string, string> = {
  FILE_TOO_LARGE: 'Файл больше 10 МБ. Разбейте его на несколько частей.',
  TOO_MANY_ROWS: 'В файле больше 5000 строк. Разбейте его на несколько частей.',
  UNSUPPORTED_FORMAT: 'Неподдерживаемый формат. Используйте CSV, XLSX или XLS.',
  EMPTY_FILE: 'Файл пустой или не содержит колонок.',
  FILE_REQUIRED: 'Выберите файл для загрузки.',
  INVALID_FORM_DATA: 'Не удалось прочитать файл. Попробуйте ещё раз.',
};
const DEFAULT_ERROR_MESSAGE = 'Произошла ошибка. Попробуйте ещё раз.';

interface FileUploadStepProps {
  onParsed: (result: ImportPreviewParseResult, fileName: string) => void;
}

export default function FileUploadStep({ onParsed }: FileUploadStepProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const uploadFile = useCallback(
    (file: File) => {
      setError(null);

      const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
      if (!ACCEPTED_EXTENSIONS.includes(extension)) {
        setError(PARSE_ERROR_MESSAGES.UNSUPPORTED_FORMAT);
        return;
      }
      if (file.size > MAX_FILE_SIZE_BYTES) {
        setError(PARSE_ERROR_MESSAGES.FILE_TOO_LARGE);
        return;
      }

      setIsUploading(true);

      const formData = new FormData();
      formData.append('file', file);

      fetch('/api/import/preview', { method: 'POST', body: formData })
        .then(async (res) => {
          const data: unknown = await res.json().catch(() => ({}));
          if (!res.ok) {
            const code = (data as { error?: string }).error;
            setError((code && PARSE_ERROR_MESSAGES[code]) || DEFAULT_ERROR_MESSAGE);
            return;
          }
          onParsed(data as ImportPreviewParseResult, file.name);
        })
        .catch(() => setError(DEFAULT_ERROR_MESSAGE))
        .finally(() => setIsUploading(false));
    },
    [onParsed],
  );

  function handleInputChange(event: ChangeEvent<HTMLInputElement>): void {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file) uploadFile(file);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>): void {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (file) uploadFile(file);
  }

  return (
    <div>
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') inputRef.current?.click();
        }}
        className={`
          flex cursor-pointer flex-col items-center justify-center gap-3
          rounded-[12px] border-[1.5px] border-dashed px-6 py-14 text-center
          transition-colors duration-150
          ${isDragging
            ? 'border-[#10B981] bg-[var(--color-primary-light)]'
            : 'border-[var(--color-border)] hover:border-[#10B981]'}
        `}
      >
        <Icon
          icon="lucide:upload-cloud"
          className="h-8 w-8 text-[var(--color-text-tertiary)]"
          aria-hidden="true"
        />
        <p className="text-[14px] font-medium text-[var(--color-text-primary)]">
          {isUploading ? 'Загрузка файла…' : 'Перетащите файл сюда или нажмите, чтобы выбрать'}
        </p>
        <p className="text-[12px] text-[var(--color-text-tertiary)]">
          CSV, XLSX, XLS — до 10 МБ, не более 5000 строк
        </p>
        <Button
          variant="secondary"
          size="sm"
          type="button"
          disabled={isUploading}
          onClick={(event) => {
            event.stopPropagation();
            inputRef.current?.click();
          }}
        >
          Выбрать файл
        </Button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".csv,.xlsx,.xls"
        className="hidden"
        onChange={handleInputChange}
        // Chromium adds a client-only `caret-color` style to file inputs near
        // drag-and-drop listeners — a browser artifact, not a render mismatch.
        suppressHydrationWarning
      />

      {error && <p className="mt-3 text-center text-[13px] text-[#EF4444]">{error}</p>}
    </div>
  );
}
