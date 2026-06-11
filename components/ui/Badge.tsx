import { type ReactNode } from 'react';

// ─── Status Badge (воронка) ───────────────────────────────────────
type StatusType = 'new' | 'contact' | 'in-progress' | 'warm' | 'deal';

const statusConfig: Record<StatusType, {
  label: string;
  bg: string;
  text: string;
  dot: string;
}> = {
  'new':         { label: 'Новый лид',          bg: '#EFF6FF', text: '#1D4ED8', dot: '#3B82F6' },
  'contact':     { label: 'Первичный контакт',  bg: '#F5F3FF', text: '#6D28D9', dot: '#8B5CF6' },
  'in-progress': { label: 'В работе',           bg: '#FFFBEB', text: '#B45309', dot: '#F59E0B' },
  'warm':        { label: 'Тёплый клиент',      bg: '#ECFDF5', text: '#065F46', dot: '#10B981' },
  'deal':        { label: 'Сделка',             bg: '#F0FDF4', text: '#166534', dot: '#22C55E' },
};

interface StatusBadgeProps {
  status: StatusType;
  className?: string;
}

export function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  const cfg = statusConfig[status];
  return (
    <span
      className={`inline-flex items-center gap-[5px] px-[10px] py-[4px] rounded-[20px] text-[12px] font-medium ${className}`}
      style={{ backgroundColor: cfg.bg, color: cfg.text }}
    >
      <span
        className="w-[6px] h-[6px] rounded-full flex-shrink-0"
        style={{ backgroundColor: cfg.dot }}
      />
      {cfg.label}
    </span>
  );
}

// ─── List Status Badge (список лидов) ─────────────────────────────
export type ListStatusType = 'new' | 'in-progress' | 'success' | 'rejected';

const listStatusConfig: Record<ListStatusType, {
  label: string;
  bgClass: string;
  textClass: string;
  icon: ReactNode;
}> = {
  new: {
    label: 'Новый',
    bgClass: 'bg-[#EFF6FF]',
    textClass: 'text-[#1D4ED8]',
    icon: (
      <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  'in-progress': {
    label: 'В работе',
    bgClass: 'bg-[#FFFBEB]',
    textClass: 'text-[#B45309]',
    icon: (
      <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  success: {
    label: 'Успешно',
    bgClass: 'bg-[var(--color-primary-light)]',
    textClass: 'text-[var(--color-primary-dark)]',
    icon: (
      <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    ),
  },
  rejected: {
    label: 'Отказ',
    bgClass: 'bg-[var(--color-bg-surface-2)]',
    textClass: 'text-[var(--color-text-secondary)]',
    icon: (
      <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    ),
  },
};

interface ListStatusBadgeProps {
  status: ListStatusType;
  className?: string;
}

export function ListStatusBadge({ status, className = '' }: ListStatusBadgeProps) {
  const cfg = listStatusConfig[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-[20px] px-[10px] py-1 text-[12px] font-medium ${cfg.bgClass} ${cfg.textClass} ${className}`}
    >
      {cfg.icon}
      {cfg.label}
    </span>
  );
}

// ─── Lead Source Badge (список лидов) ─────────────────────────────
export type LeadSourceType = 'tilda' | 'yandex' | 'wordpress' | 'api';

const leadSourceConfig: Record<LeadSourceType, {
  label: string;
  bgClass: string;
  textClass: string;
  icon: ReactNode;
}> = {
  tilda: {
    label: 'Tilda',
    bgClass: 'bg-[var(--color-primary-light)]',
    textClass: 'text-[var(--color-primary-dark)]',
    icon: (
      <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
      </svg>
    ),
  },
  yandex: {
    label: 'Директ',
    bgClass: 'bg-[#FFFBEB]',
    textClass: 'text-[#B45309]',
    icon: (
      <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
      </svg>
    ),
  },
  wordpress: {
    label: 'WP',
    bgClass: 'bg-[#EFF6FF]',
    textClass: 'text-[#1D4ED8]',
    icon: (
      <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
  },
  api: {
    label: 'API',
    bgClass: 'bg-[#F5F3FF]',
    textClass: 'text-[#6D28D9]',
    icon: (
      <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
      </svg>
    ),
  },
};

interface LeadSourceBadgeProps {
  source: LeadSourceType;
  className?: string;
}

export function LeadSourceBadge({ source, className = '' }: LeadSourceBadgeProps) {
  const cfg = leadSourceConfig[source];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-[8px] px-2.5 py-1 text-[12px] font-medium ${cfg.bgClass} ${cfg.textClass} ${className}`}
    >
      {cfg.icon}
      {cfg.label}
    </span>
  );
}

// ─── Source Badge (источник лида) ────────────────────────────────
type SourceType = 'tilda' | 'wordpress' | 'yandex' | 'api' | 'organic' | 'other';

const sourceConfig: Record<SourceType, { label: string; iconClass: string }> = {
  tilda:     { label: 'Tilda',               iconClass: 'text-[var(--color-primary)]' },
  wordpress: { label: 'WordPress',           iconClass: 'text-[var(--color-info)]' },
  yandex:    { label: 'Яндекс Директ',       iconClass: 'text-[var(--color-warning)]' },
  api:       { label: 'API / Webhook',       iconClass: 'text-[var(--color-purple)]' },
  organic:   { label: 'Органический поиск',  iconClass: 'text-[var(--color-text-tertiary)]' },
  other:     { label: 'Другой',              iconClass: 'text-[var(--color-text-tertiary)]' },
};

interface SourceBadgeProps {
  source: SourceType;
  icon?: ReactNode;
  className?: string;
}

export function SourceBadge({ source, icon, className = '' }: SourceBadgeProps) {
  const cfg = sourceConfig[source];
  return (
    <span
      className={`
        inline-flex items-center gap-[6px]
        px-[12px] py-[5px]
        bg-[var(--color-bg-surface-2)]
        border border-[var(--color-border)] border-[0.5px]
        rounded-[8px]
        text-[12px] font-medium
        text-[var(--color-text-primary)]
        ${className}
      `}
    >
      {icon && (
        <span className={`w-3 h-3 flex-shrink-0 ${cfg.iconClass}`}>
          {icon}
        </span>
      )}
      {cfg.label}
    </span>
  );
}

// ─── Generic Badge ────────────────────────────────────────────────
interface BadgeProps {
  children: ReactNode;
  bg?: string;
  color?: string;
  className?: string;
}

export function Badge({ children, bg, color, className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-[10px] py-[4px] rounded-[20px] text-[12px] font-medium ${className}`}
      style={{ backgroundColor: bg, color }}
    >
      {children}
    </span>
  );
}
