import Link from 'next/link';
import { StatusBadge } from '@/components/ui/Badge';

type PipelineStatus = 'new' | 'contact' | 'in-progress' | 'warm' | 'deal';

interface LeadHeaderProps {
  name: string;
  status: PipelineStatus;
}

export default function LeadHeader({ name, status }: LeadHeaderProps) {
  return (
    <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-col gap-2">
        <Link
          href="/leads"
          className="text-[13px] text-[var(--color-text-secondary)] transition-colors duration-150 hover:text-[var(--color-text-primary)]"
        >
          ← Назад к лидам
        </Link>
        <h1 className="text-[28px] font-medium tracking-[-0.01em] text-[var(--color-text-primary)]">
          {name}
        </h1>
      </div>

      <div className="flex items-center gap-3">
        <StatusBadge status={status} />
      </div>
    </header>
  );
}
