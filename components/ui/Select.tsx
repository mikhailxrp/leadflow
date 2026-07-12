'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
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
  const [position, setPosition] = useState<{ top: number; left: number; width: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const selectedLabel = options.find((o) => o.value === value)?.label;

  useEffect(() => {
    function handleMouseDown(e: MouseEvent) {
      const target = e.target as Node;
      if (containerRef.current?.contains(target) || listRef.current?.contains(target)) {
        return;
      }
      setOpen(false);
    }
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, []);

  // Список рендерится в портал (document.body) с position: fixed, чтобы не
  // обрезаться overflow-hidden предков (например, SettingsCard) — координаты
  // считаются от кнопки-триггера и пересчитываются при скролле/ресайзе, пока открыт.
  useLayoutEffect(() => {
    if (!open || !buttonRef.current) {
      setPosition(null);
      return;
    }

    function updatePosition(): void {
      const rect = buttonRef.current!.getBoundingClientRect();
      setPosition({ top: rect.bottom + 4, left: rect.left, width: rect.width });
    }

    updatePosition();
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [open]);

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
        ref={buttonRef}
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

      {/* Список опций — портал, чтобы не обрезаться overflow-hidden предков */}
      {open &&
        position &&
        createPortal(
          <ul
            ref={listRef}
            role="listbox"
            style={{
              position: 'fixed',
              top: position.top,
              left: position.left,
              width: position.width,
              background: 'var(--color-bg-surface)',
              border: '0.5px solid var(--color-border)',
              borderRadius: 'var(--radius-sm)',
            }}
            className="z-50 max-h-48 overflow-y-auto shadow-lg"
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
          </ul>,
          document.body,
        )}
    </div>
  );
}
