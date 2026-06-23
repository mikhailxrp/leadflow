'use client';

import { useState, type ReactNode } from 'react';
import CompaniesTable from '@/components/platform/CompaniesTable';
import CreateCompanyModal from '@/components/platform/CreateCompanyModal';
import type { PlatformCompanyListItem } from '@/types/platform';

interface CompaniesPageClientProps {
  companies: PlatformCompanyListItem[];
}

export default function CompaniesPageClient({
  companies,
}: CompaniesPageClientProps): ReactNode {
  const [isModalOpen, setIsModalOpen] = useState(false);

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

      <CompaniesTable companies={companies} />

      <CreateCompanyModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </main>
  );
}
