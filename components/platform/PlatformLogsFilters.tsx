'use client';

import { EventType, type PlatformRole } from '@prisma/client';
import { getPlatformEventLabel } from '@/constants/eventLabels';
import Select from '@/components/ui/Select';
import LeadPathSearch from '@/components/platform/LeadPathSearch';
import type { PlatformLogsCompanyOption } from '@/app/(platform)/platform/logs/page';
import type { SelectedLead } from '@/components/platform/PlatformLogsClient';

const ALL_TYPES_VALUE = '';

const TYPE_OPTIONS = [
  { value: ALL_TYPES_VALUE, label: 'Все типы' },
  ...Object.values(EventType).map((type) => ({
    value: type,
    label: getPlatformEventLabel(type),
  })),
];

interface PlatformLogsFiltersProps {
  companies: PlatformLogsCompanyOption[];
  companyId: string;
  onCompanyChange: (companyId: string) => void;
  type: EventType | '';
  onTypeChange: (type: EventType | '') => void;
  from: string;
  onFromChange: (from: string) => void;
  to: string;
  onToChange: (to: string) => void;
  role: PlatformRole;
  leadPathMode: boolean;
  onLeadPathModeChange: (mode: boolean) => void;
  selectedLead: SelectedLead | null;
  onLeadSelect: (lead: SelectedLead | null) => void;
}

function fieldLabelClassName(): string {
  return 'mb-1 block text-[11px] font-medium text-[var(--color-text-secondary)]';
}

function dateInputClassName(): string {
  return `
    h-[36px] w-full rounded-[6px] border border-[0.5px]
    border-[var(--color-border)] bg-[var(--color-bg-surface)]
    px-3 text-[13px] text-[var(--color-text-primary)]
    outline-none transition-colors duration-150
    focus:border-[#10B981]
  `;
}

export default function PlatformLogsFilters({
  companies,
  companyId,
  onCompanyChange,
  type,
  onTypeChange,
  from,
  onFromChange,
  to,
  onToChange,
  role,
  leadPathMode,
  onLeadPathModeChange,
  selectedLead,
  onLeadSelect,
}: PlatformLogsFiltersProps) {
  const companyOptions = companies.map((company) => ({
    value: company.id,
    label: company.name,
  }));

  return (
    <div
      className="
        rounded-[14px] border border-[0.5px] border-[var(--color-border)]
        bg-[var(--color-bg-surface)] p-4
      "
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className={fieldLabelClassName()}>Компания</p>
          <Select
            value={companyId}
            onChange={onCompanyChange}
            options={companyOptions}
            placeholder="Выберите компанию"
          />
        </div>

        <div>
          <p className={fieldLabelClassName()}>Тип события</p>
          <Select
            value={type}
            onChange={(value) => onTypeChange(value as EventType | '')}
            options={TYPE_OPTIONS}
            placeholder="Все типы"
            disabled={!companyId}
          />
        </div>

        <div>
          <label htmlFor="logs-from" className={fieldLabelClassName()}>
            С даты
          </label>
          <input
            id="logs-from"
            type="date"
            value={from}
            disabled={!companyId}
            onChange={(event) => onFromChange(event.target.value)}
            className={`${dateInputClassName()} disabled:opacity-60`}
          />
        </div>

        <div>
          <label htmlFor="logs-to" className={fieldLabelClassName()}>
            По дату
          </label>
          <input
            id="logs-to"
            type="date"
            value={to}
            disabled={!companyId}
            onChange={(event) => onToChange(event.target.value)}
            className={`${dateInputClassName()} disabled:opacity-60`}
          />
        </div>
      </div>

      {role === 'MARKETER' ? (
        <div className="mt-4 border-t border-[0.5px] border-[var(--color-border)] pt-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[13px] font-medium text-[var(--color-text-primary)] pl-3">
              Путь лида
            </p>
            <button
              type="button"
              role="switch"
              aria-checked={leadPathMode}
              disabled={!companyId}
              onClick={() => onLeadPathModeChange(!leadPathMode)}
              className={`
                relative h-[22px] w-[40px] flex-shrink-0 rounded-full
                transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50
                ${leadPathMode ? 'bg-[#10B981]' : 'bg-[var(--color-bg-surface-2)]'}
              `}
            >
              <span
                className={`
                  absolute top-[2px] h-[18px] w-[18px] rounded-full bg-white
                  transition-transform duration-150
                  ${leadPathMode ? 'translate-x-[20px]' : 'translate-x-[2px]'}
                `}
              />
            </button>
          </div>

          {leadPathMode ? (
            <LeadPathSearch
              companyId={companyId}
              selectedLead={selectedLead}
              onLeadSelect={onLeadSelect}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
