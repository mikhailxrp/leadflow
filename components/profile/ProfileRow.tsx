import { type ReactNode } from "react";

interface ProfileRowProps {
  label: string;
  children: ReactNode;
}

export default function ProfileRow({ label, children }: ProfileRowProps) {
  return (
    <div className="flex min-h-[52px] flex-col gap-2 border-b-[0.5px] border-[var(--color-border)] px-6 py-[14px] last:border-0 sm:flex-row sm:items-center sm:gap-0">
      <span className="text-[14px] text-[var(--color-text-primary)] sm:w-[180px] sm:shrink-0">
        {label}
      </span>
      <div className="flex w-full flex-1 items-center sm:w-auto">{children}</div>
    </div>
  );
}
