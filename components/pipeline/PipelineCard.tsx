'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { type CSSProperties, type ReactNode } from 'react';

const TAG_STYLES: Record<string, { bgClass: string; textClass: string }> = {
  Сайт: { bgClass: 'bg-[#EFF6FF]', textClass: 'text-[#1D4ED8]' },
  Telegram: { bgClass: 'bg-[#E0F2FE]', textClass: 'text-[#0284C7]' },
  Горячий: { bgClass: 'bg-[#FEF2F2]', textClass: 'text-[#DC2626]' },
  Звонок: { bgClass: 'bg-[#ECFDF5]', textClass: 'text-[#065F46]' },
  Уточнить: { bgClass: 'bg-[#FEFCE8]', textClass: 'text-[#A16207]' },
  Email: { bgClass: 'bg-[var(--color-bg-surface)]', textClass: 'text-[var(--color-text-secondary)]' },
  Выставка: { bgClass: 'bg-[#F5F3FF]', textClass: 'text-[#6D28D9]' },
  VK: { bgClass: 'bg-[#EFF6FF]', textClass: 'text-[#1D4ED8]' },
  Перезвонить: { bgClass: 'bg-[#FFFBEB]', textClass: 'text-[#B45309]' },
  Тендер: { bgClass: 'bg-[#EFF6FF]', textClass: 'text-[#1D4ED8]' },
  'КП отправлено': { bgClass: 'bg-[#ECFDF5]', textClass: 'text-[#065F46]' },
  Встреча: { bgClass: 'bg-[#EFF6FF]', textClass: 'text-[#1D4ED8]' },
  Партнёры: { bgClass: 'bg-[#ECFDF5]', textClass: 'text-[#065F46]' },
  Договор: { bgClass: 'bg-[#ECFDF5]', textClass: 'text-[#065F46]' },
  Рекомендация: { bgClass: 'bg-[#FEF2F2]', textClass: 'text-[#DC2626]' },
  Оплачено: { bgClass: 'bg-[#F0FDF4]', textClass: 'text-[#166534]' },
};

const DEFAULT_TAG_STYLE = {
  bgClass: 'bg-[var(--color-bg-surface)]',
  textClass: 'text-[var(--color-text-secondary)]',
};

interface PipelineCardContentProps {
  name: string;
  phone: string;
  tags: string[];
  manager: string;
}

function PersonIcon(): ReactNode {
  return (
    <svg
      className="h-3 w-3 flex-shrink-0"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.75}
        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
      />
    </svg>
  );
}

function PipelineTag({ label }: { label: string }): ReactNode {
  const style = TAG_STYLES[label] ?? DEFAULT_TAG_STYLE;

  return (
    <span
      className={`
        inline-flex items-center rounded-[4px] px-1.5 py-0.5
        text-[11px] font-medium
        ${style.bgClass} ${style.textClass}
      `}
    >
      {label}
    </span>
  );
}

export function PipelineCardContent({
  name,
  phone,
  tags,
  manager,
}: PipelineCardContentProps): ReactNode {
  return (
    <>
      <p className="text-[13px] font-medium text-[var(--color-text-primary)]">{name}</p>
      <p className="mt-1 text-[12px] text-[var(--color-text-secondary)]">{phone}</p>

      {tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {tags.map((tag) => (
            <PipelineTag key={tag} label={tag} />
          ))}
        </div>
      )}

      <div className="mt-2 flex items-center gap-1 text-[11px] text-[var(--color-text-tertiary)]">
        <PersonIcon />
        <span>{manager}</span>
      </div>
    </>
  );
}

interface PipelineCardShellProps extends PipelineCardContentProps {
  className?: string;
  style?: CSSProperties;
  dragHandleProps?: Record<string, unknown>;
  onClick?: () => void;
}

function PipelineCardShell({
  name,
  phone,
  tags,
  manager,
  className = '',
  style,
  dragHandleProps,
  onClick,
}: PipelineCardShellProps): ReactNode {
  return (
    <article
      style={style}
      {...dragHandleProps}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        onClick
          ? (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      className={`
        touch-none rounded-md border border-[var(--color-border)] border-[0.5px]
        bg-[var(--color-bg-surface)] p-3
        transition-colors duration-150
        ${className}
      `}
    >
      <PipelineCardContent
        name={name}
        phone={phone}
        tags={tags}
        manager={manager}
      />
    </article>
  );
}

interface PipelineCardProps {
  id: string;
  name: string;
  phone: string;
  tags: string[];
  manager: string;
  onClick?: (id: string) => void;
}

export default function PipelineCard({
  id,
  name,
  phone,
  tags,
  manager,
  onClick,
}: PipelineCardProps): ReactNode {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const dragStyle: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={dragStyle}>
      <PipelineCardShell
        name={name}
        phone={phone}
        tags={tags}
        manager={manager}
        dragHandleProps={{ ...attributes, ...listeners }}
        onClick={() => onClick?.(id)}
        className={`
          cursor-grab hover:border-[var(--color-primary)]
          ${isDragging ? 'opacity-50' : ''}
        `}
      />
    </div>
  );
}

export function PipelineCardOverlay({
  name,
  phone,
  tags,
  manager,
}: PipelineCardContentProps): ReactNode {
  return (
    <PipelineCardShell
      name={name}
      phone={phone}
      tags={tags}
      manager={manager}
      className="cursor-grabbing shadow-sm hover:border-[var(--color-border)]"
    />
  );
}
