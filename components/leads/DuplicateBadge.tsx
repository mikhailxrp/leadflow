import { type ReactNode } from 'react';
import Link from 'next/link';

interface DuplicateBadgeProps {
  matchedLeadId: string;
}

export default function DuplicateBadge({ matchedLeadId }: DuplicateBadgeProps): ReactNode {
  return (
    <Link
      href={`/leads/${matchedLeadId}`}
      title="Возможный дубль — перейти к связанному лиду"
      aria-label="Возможный дубль"
      className="inline-flex items-center text-[var(--color-warning)] transition-opacity duration-150 hover:opacity-70"
    >
      <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
        <path
          fillRule="evenodd"
          d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
          clipRule="evenodd"
        />
      </svg>
    </Link>
  );
}
