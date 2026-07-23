'use client';

import { useState } from 'react';
import type { EventType, PlatformRole } from '@prisma/client';
import PlatformLogsFilters from '@/components/platform/PlatformLogsFilters';
import PlatformLogsTable from '@/components/platform/PlatformLogsTable';
import type { PlatformLogsCompanyOption } from '@/app/(platform)/platform/logs/page';

interface PlatformLogsClientProps {
  companies: PlatformLogsCompanyOption[];
  role: PlatformRole;
}

export interface SelectedLead {
  id: string;
  label: string;
}

export default function PlatformLogsClient({
  companies,
  role,
}: PlatformLogsClientProps) {
  const [companyId, setCompanyId] = useState('');
  const [type, setType] = useState<EventType | ''>('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [leadPathMode, setLeadPathMode] = useState(false);
  const [selectedLead, setSelectedLead] = useState<SelectedLead | null>(null);
  const [page, setPage] = useState(1);

  function handleCompanyChange(nextCompanyId: string): void {
    setCompanyId(nextCompanyId);
    setLeadPathMode(false);
    setSelectedLead(null);
    setPage(1);
  }

  function handleTypeChange(nextType: EventType | ''): void {
    setType(nextType);
    setPage(1);
  }

  function handleFromChange(nextFrom: string): void {
    setFrom(nextFrom);
    setPage(1);
  }

  function handleToChange(nextTo: string): void {
    setTo(nextTo);
    setPage(1);
  }

  function handleLeadPathModeChange(nextMode: boolean): void {
    setLeadPathMode(nextMode);
    setSelectedLead(null);
    setPage(1);
  }

  function handleLeadSelect(lead: SelectedLead | null): void {
    setSelectedLead(lead);
    setPage(1);
  }

  const leadId = role === 'MARKETER' && leadPathMode ? selectedLead?.id : undefined;

  return (
    <main className="px-4 py-6 sm:px-6 sm:py-8">
      <h1 className="mb-6 text-[20px] font-medium text-[var(--color-text-primary)]">
        Логи
      </h1>

      <PlatformLogsFilters
        companies={companies}
        companyId={companyId}
        onCompanyChange={handleCompanyChange}
        type={type}
        onTypeChange={handleTypeChange}
        from={from}
        onFromChange={handleFromChange}
        to={to}
        onToChange={handleToChange}
        role={role}
        leadPathMode={leadPathMode}
        onLeadPathModeChange={handleLeadPathModeChange}
        selectedLead={selectedLead}
        onLeadSelect={handleLeadSelect}
      />

      <div className="mt-6">
        <PlatformLogsTable
          companyId={companyId}
          type={type || undefined}
          from={from}
          to={to}
          leadId={leadId}
          leadPathModeWithoutLead={leadPathMode && !selectedLead}
          page={page}
          onPageChange={setPage}
        />
      </div>
    </main>
  );
}
