'use client';

import { type KeyboardEvent, useState } from 'react';
import { Icon } from '@iconify/react';
import Input from '@/components/ui/Input';

interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
}

export default function TagInput({ tags, onChange }: TagInputProps) {
  const [inputValue, setInputValue] = useState('');

  function addTag(raw: string): void {
    const tag = raw.trim();
    if (!tag || tags.includes(tag)) {
      return;
    }
    onChange([...tags, tag]);
    setInputValue('');
  }

  function removeTag(tag: string): void {
    onChange(tags.filter((item) => item !== tag));
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>): void {
    if (event.key !== 'Enter') {
      return;
    }
    event.preventDefault();
    addTag(inputValue);
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor="lead-tags"
        className="text-[12px] font-normal leading-5 text-[var(--color-text-secondary)]"
      >
        Теги
      </label>

      <Input
        id="lead-tags"
        value={inputValue}
        onChange={(event) => setInputValue(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Введите тег и нажмите Enter"
        icon={
          <Icon
            icon="tabler:tag"
            className="h-4 w-4 text-[var(--color-text-tertiary)]"
            aria-hidden="true"
          />
        }
      />

      {tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {tags.map((tag) => (
            <span
              key={tag}
              className="
                inline-flex items-center rounded-[20px]
                border-[0.5px] border-[var(--color-border)]
                bg-[var(--color-bg-surface-2)] px-3 py-1
                text-[12px] text-[var(--color-text-primary)]
              "
            >
              {tag}
              <button
                type="button"
                className="ml-1 text-[var(--color-text-tertiary)] transition-colors duration-150 hover:text-[var(--color-text-primary)]"
                aria-label={`Удалить тег «${tag}»`}
                onClick={() => removeTag(tag)}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
