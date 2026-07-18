'use client';

import { type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon } from '@iconify/react';

export interface HelpNavItem {
  href: string;
  label: string;
  icon: string;
}

interface HelpNavProps {
  items: HelpNavItem[];
  variant?: 'sidebar' | 'mobile';
}

export default function HelpNav({ items, variant = 'sidebar' }: HelpNavProps): ReactNode {
  const pathname = usePathname();

  function isActive(href: string): boolean {
    if (href === '/help') return pathname === '/help';
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  if (variant === 'mobile') {
    return (
      <nav
        aria-label="Разделы помощи"
        className="custom-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1"
      >
        {items.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={`flex flex-shrink-0 items-center gap-2 rounded-[6px] border-[0.5px] px-3 py-1.5 text-[13px] font-medium transition-colors ${
                active
                  ? 'border-transparent bg-[color-mix(in_srgb,var(--color-primary)_14%,transparent)] text-[var(--color-primary)]'
                  : 'border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
              }`}
            >
              <Icon icon={item.icon} className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
              <span className="whitespace-nowrap">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    );
  }

  return (
    <nav aria-label="Разделы помощи" className="flex flex-col gap-0.5">
      <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)]">
        Руководство
      </p>
      {items.map((item) => {
        const active = isActive(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={`flex items-center gap-2.5 rounded-[6px] px-3 py-2 text-[13.5px] font-medium transition-colors ${
              active
                ? 'bg-[color-mix(in_srgb,var(--color-primary)_14%,transparent)] text-[var(--color-primary)]'
                : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-surface-2)] hover:text-[var(--color-text-primary)]'
            }`}
          >
            <Icon icon={item.icon} className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
            <span className="truncate">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
