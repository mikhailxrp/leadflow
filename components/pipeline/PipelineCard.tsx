'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { type CSSProperties, type ReactNode } from 'react';
import type { CloseType } from '@prisma/client';
import RiskBadge from '@/components/leads/RiskBadge';
import type { RiskLevel } from '@/lib/risk/computeRisk';

interface PipelineCardContentProps {
  name: string | null;
  phone: string | null;
  source: string;
  assignedTo: { id: string; name: string } | null;
  risk: { level: RiskLevel; reason: string | null };
  closeType: CloseType | null;
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

function PipelineCardContent({
  name,
  phone,
  source,
  assignedTo,
  risk,
}: PipelineCardContentProps): ReactNode {
  return (
    <>
      <p className="text-[13px] font-medium text-[var(--color-text-primary)]">
        {name ?? '—'}
      </p>
      <p className="mt-1 text-[12px] text-[var(--color-text-secondary)]">
        {phone ?? '—'}
      </p>

      <div className="mt-2">
        <span
          className="
            inline-flex items-center rounded-[4px] px-1.5 py-0.5
            text-[11px] font-medium
            bg-[var(--color-bg-surface-2)] text-[var(--color-text-secondary)]
          "
        >
          {source}
        </span>
      </div>

      <div className="mt-2 flex items-center justify-between gap-1">
        <div className="flex min-w-0 items-center gap-1 text-[11px] text-[var(--color-text-tertiary)]">
          <PersonIcon />
          <span className="truncate">{assignedTo?.name ?? '—'}</span>
        </div>
        <RiskBadge level={risk.level} reason={risk.reason} />
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
  source,
  assignedTo,
  risk,
  closeType,
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
        source={source}
        assignedTo={assignedTo}
        risk={risk}
        closeType={closeType}
      />
    </article>
  );
}

interface PipelineCardProps {
  id: string;
  name: string | null;
  phone: string | null;
  source: string;
  assignedTo: { id: string; name: string } | null;
  risk: { level: RiskLevel; reason: string | null };
  closeType: CloseType | null;
  onClick?: (id: string) => void;
}

export default function PipelineCard({
  id,
  name,
  phone,
  source,
  assignedTo,
  risk,
  closeType,
  onClick,
}: PipelineCardProps): ReactNode {
  const isClosed = closeType !== null;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled: isClosed });

  const dragStyle: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={dragStyle}>
      <PipelineCardShell
        name={name}
        phone={phone}
        source={source}
        assignedTo={assignedTo}
        risk={risk}
        closeType={closeType}
        dragHandleProps={isClosed ? undefined : { ...attributes, ...listeners }}
        onClick={() => onClick?.(id)}
        className={`
          ${isClosed
            ? 'cursor-default opacity-60'
            : 'cursor-grab hover:border-[var(--color-primary)]'
          }
          ${isDragging ? 'opacity-50' : ''}
        `}
      />
    </div>
  );
}

export type PipelineCardOverlayProps = PipelineCardContentProps;

export function PipelineCardOverlay({
  name,
  phone,
  source,
  assignedTo,
  risk,
  closeType,
}: PipelineCardOverlayProps): ReactNode {
  return (
    <PipelineCardShell
      name={name}
      phone={phone}
      source={source}
      assignedTo={assignedTo}
      risk={risk}
      closeType={closeType}
      className="cursor-grabbing shadow-sm hover:border-[var(--color-border)]"
    />
  );
}
