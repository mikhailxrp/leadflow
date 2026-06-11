'use client';

import { type ReactNode } from 'react';
import { Icon } from '@iconify/react';

interface ProfileSectionCardProps {
  icon: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
}

export default function ProfileSectionCard({
  icon,
  title,
  subtitle,
  children,
}: ProfileSectionCardProps) {
  return (
    <section className="overflow-hidden rounded-lg border-[0.5px] border-[var(--color-border)] bg-[var(--color-bg-surface)]">
      <div className="border-b-[0.5px] border-[var(--color-border)] px-6 py-4">
        <div className="flex items-center gap-2">
          <Icon
            icon={icon}
            className="h-4 w-4 shrink-0 text-[var(--color-text-secondary)]"
            aria-hidden="true"
          />
          <h2 className="text-[15px] font-medium text-[var(--color-text-primary)]">{title}</h2>
        </div>
        {subtitle && (
          <p className="mt-0.5 text-[12px] text-[var(--color-text-secondary)]">{subtitle}</p>
        )}
      </div>
      {children}
    </section>
  );
}
