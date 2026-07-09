import { type ReactNode } from "react";

interface ProfileRowProps {
  label: string;
  children: ReactNode;
}

export default function ProfileRow({ label, children }: ProfileRowProps) {
  return (
    <div className="flex min-h-[52px] items-center border-b-[0.5px] border-[var(--color-border)]  px-6 py-[14px] last:border-0">
      <span className="w-[180px] shrink-0 text-[14px] text-[var(--color-text-primary)]">
        {label}
      </span>
      <div className="flex flex-1 items-center">{children}</div>
    </div>
  );
}
