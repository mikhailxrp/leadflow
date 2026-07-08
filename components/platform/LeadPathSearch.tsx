'use client';

import { useEffect, useState } from 'react';
import type { PlatformLogLeadSearchResult } from '@/types/platform';
import type { SelectedLead } from '@/components/platform/PlatformLogsClient';

interface LeadPathSearchProps {
  companyId: string;
  selectedLead: SelectedLead | null;
  onLeadSelect: (lead: SelectedLead | null) => void;
}

const SEARCH_DEBOUNCE_MS = 300;
const MIN_QUERY_LENGTH = 2;

function formatLeadLabel(lead: PlatformLogLeadSearchResult): string {
  const parts = [lead.name, lead.phone, lead.email].filter(
    (part): part is string => Boolean(part),
  );
  return parts.length > 0 ? parts.join(' · ') : 'Без имени';
}

export default function LeadPathSearch({
  companyId,
  selectedLead,
  onLeadSelect,
}: LeadPathSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PlatformLogLeadSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const trimmed = query.trim();

    if (trimmed.length < MIN_QUERY_LENGTH) {
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setIsLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({ companyId, q: trimmed });
        const response = await fetch(`/api/platform/logs/leads?${params}`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error('Failed to search leads');
        }

        const data = (await response.json()) as PlatformLogLeadSearchResult[];
        setResults(data);
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          return;
        }
        console.error(err);
        setError('Не удалось найти лида');
      } finally {
        setIsLoading(false);
      }
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [companyId, query]);

  function handleSelect(lead: PlatformLogLeadSearchResult): void {
    onLeadSelect({ id: lead.id, label: formatLeadLabel(lead) });
    setQuery('');
    setResults([]);
  }

  if (selectedLead) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-[6px] bg-[var(--color-bg-surface-2)] px-3 py-2">
        <span className="truncate text-[13px] text-[var(--color-text-primary)]">
          {selectedLead.label}
        </span>
        <button
          type="button"
          onClick={() => onLeadSelect(null)}
          className="shrink-0 text-[12px] font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
        >
          Сбросить
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <input
        type="search"
        value={query}
        onChange={(event) => {
          const nextQuery = event.target.value;
          setQuery(nextQuery);
          if (nextQuery.trim().length < MIN_QUERY_LENGTH) {
            setResults([]);
            setError(null);
          }
        }}
        placeholder="Поиск по имени, телефону, email…"
        className="
          h-[36px] w-full rounded-[6px] border border-[0.5px]
          border-[var(--color-border)] bg-[var(--color-bg-surface)]
          px-3 text-[13px] text-[var(--color-text-primary)]
          outline-none transition-colors duration-150
          placeholder:text-[var(--color-text-tertiary)]
          focus:border-[#10B981]
        "
      />

      {error && (
        <p className="mt-1 text-[12px] text-[#EF4444]" role="alert">
          {error}
        </p>
      )}

      {isLoading || results.length > 0 ? (
        <ul
          className="
            absolute left-0 right-0 top-full z-50 mt-1 max-h-48
            overflow-y-auto rounded-[6px] border border-[0.5px]
            border-[var(--color-border)] bg-[var(--color-bg-surface)] shadow-lg
          "
        >
          {isLoading ? (
            <li className="px-3 py-2 text-[13px] text-[var(--color-text-secondary)]">
              Поиск…
            </li>
          ) : (
            results.map((lead) => (
              <li
                key={lead.id}
                onClick={() => handleSelect(lead)}
                className="
                  cursor-pointer px-3 py-2 text-[13px]
                  text-[var(--color-text-primary)] transition-colors duration-100
                  hover:bg-[var(--color-bg-surface-2)]
                "
              >
                {formatLeadLabel(lead)}
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}
