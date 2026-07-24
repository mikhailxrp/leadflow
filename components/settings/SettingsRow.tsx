import { type ReactNode } from 'react';

interface SettingsRowProps {
  label: string;
  children: ReactNode;
}

export default function SettingsRow({ label, children }: SettingsRowProps) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b-[0.5px] border-[var(--color-border)] px-5 py-3 last:border-0">
      <span className="text-[14px] text-[var(--color-text-primary)]">{label}</span>
      <div className="ml-auto flex items-center gap-3">{children}</div>
    </div>
  );
}
