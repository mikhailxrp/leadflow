'use client';

import { type ReactNode } from 'react';
import { Icon } from '@iconify/react';

interface SettingsCardProps {
  icon: string;
  title: string;
  action?: ReactNode;
  children: ReactNode;
}

export default function SettingsCard({ icon, title, action, children }: SettingsCardProps) {
  return (
    <section className="overflow-hidden rounded-lg border-[0.5px] border-[var(--color-border)] bg-[var(--color-bg-surface)]">
      <div className="flex items-center justify-between border-b-[0.5px] border-[var(--color-border)] px-5 py-4">
        <div className="flex items-center gap-2">
          <Icon
            icon={icon}
            className="h-5 w-5 flex-shrink-0 text-[var(--color-text-secondary)]"
            aria-hidden="true"
          />
          <h2 className="text-[15px] font-medium text-[var(--color-text-primary)]">{title}</h2>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
