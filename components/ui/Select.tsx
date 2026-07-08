'use client';

import { useEffect, useRef, useState } from 'react';
import { Icon } from '@iconify/react';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export default function Select({
  value,
  onChange,
  options,
  placeholder = 'Выберите...',
  disabled = false,
  className = '',
}: SelectProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedLabel = options.find((o) => o.value === value)?.label;

  useEffect(() => {
    function handleMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, []);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Скрытый нативный select для accessibility и сериализации форм */}
      <select
        className="sr-only"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        tabIndex={-1}
        aria-hidden="true"
      >
        {!value && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>

      {/* Визуальный триггер */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={open}
        style={{
          height: '36px',
          border: `0.5px solid ${open ? '#10B981' : 'var(--color-border)'}`,
          borderRadius: 'var(--radius-sm)',
          background: 'var(--color-bg-surface)',
          color: selectedLabel ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)',
        }}
        className="flex w-full items-center justify-between gap-2 px-3 text-[13px] outline-none transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span className="truncate">{selectedLabel ?? placeholder}</span>
        <Icon
          icon="lucide:chevron-down"
          className={`h-4 w-4 flex-shrink-0 text-[var(--color-text-tertiary)] transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>

      {/* Список опций */}
      {open && (
        <ul
          role="listbox"
          style={{
            background: 'var(--color-bg-surface)',
            border: '0.5px solid var(--color-border)',
            borderRadius: 'var(--radius-sm)',
          }}
          className="absolute left-0 right-0 top-full z-50 mt-1 max-h-48 overflow-y-auto shadow-lg"
        >
          {options.map((o) => (
            <li
              key={o.value}
              role="option"
              aria-selected={o.value === value}
              onClick={() => {
                onChange(o.value);
                setOpen(false);
              }}
              style={{
                color: o.value === value ? 'var(--color-primary)' : 'var(--color-text-primary)',
              }}
              className="cursor-pointer px-3 py-2 text-[13px] transition-colors duration-100 hover:bg-[var(--color-bg-surface-2)]"
            >
              {o.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
