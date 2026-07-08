'use client';

import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import CompaniesTable from '@/components/platform/CompaniesTable';
import CreateCompanyModal from '@/components/platform/CreateCompanyModal';
import type { PlatformCompanyListItem } from '@/types/platform';

interface CompaniesPageClientProps {
  companies: PlatformCompanyListItem[];
}

function needsRenewal(status: PlatformCompanyListItem['subscriptionStatus']): boolean {
  return status === 'expiring' || status === 'overdue';
}

export default function CompaniesPageClient({
  companies,
}: CompaniesPageClientProps): ReactNode {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const renewalCompanies = companies.filter((company) =>
    needsRenewal(company.subscriptionStatus),
  );

  return (
    <main className="px-6 py-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-[20px] font-medium text-[var(--color-text-primary)]">
          Компании
        </h1>
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="
            inline-flex h-[36px] items-center justify-center
            rounded-[6px] bg-[#10B981] px-4
            text-[13px] font-medium text-white
            transition-colors duration-150
            hover:bg-[#0E9E6E]
          "
        >
          + Создать компанию
        </button>
      </div>

      {renewalCompanies.length > 0 ? (
        <section
          className="
            mb-6 rounded-[14px] border border-[var(--color-badge-danger-border)]
            bg-[var(--color-badge-danger-bg)] px-4 py-3
          "
          aria-live="polite"
        >
          <p className="text-[14px] font-medium text-[var(--color-badge-danger-text)]">
            {renewalCompanies.length}{' '}
            {renewalCompanies.length === 1
              ? 'компания требует'
              : renewalCompanies.length < 5
                ? 'компании требуют'
                : 'компаний требуют'}{' '}
            продления:
          </p>
          <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
            {renewalCompanies.map((company) => (
              <li key={company.id}>
                <Link
                  href={`/platform/companies/${company.id}`}
                  className="
                    text-[13px] text-[var(--color-badge-danger-text)] underline
                    underline-offset-2 transition-colors duration-150
                    opacity-90 hover:opacity-100
                  "
                >
                  {company.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <CompaniesTable companies={companies} />

      <CreateCompanyModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </main>
  );
}
