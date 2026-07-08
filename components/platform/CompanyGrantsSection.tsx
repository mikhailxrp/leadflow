'use client';

import { useState, type ReactNode } from 'react';
import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import type { AvailableMarketer, CompanyGrantItem } from '@/types/platform';

interface CompanyGrantsSectionProps {
  companyId: string;
  grants: CompanyGrantItem[];
  availableMarketers: AvailableMarketer[];
}

export default function CompanyGrantsSection({
  companyId,
  grants: initialGrants,
  availableMarketers: initialAvailableMarketers,
}: CompanyGrantsSectionProps): ReactNode {
  const [grants, setGrants] = useState<CompanyGrantItem[]>(initialGrants);
  const [availableMarketers, setAvailableMarketers] = useState<
    AvailableMarketer[]
  >(initialAvailableMarketers);
  const [selectedMarketerId, setSelectedMarketerId] = useState('');
  const [isGranting, setIsGranting] = useState(false);
  const [pendingRevokeIds, setPendingRevokeIds] = useState<Set<string>>(
    new Set(),
  );
  const [error, setError] = useState<string | null>(null);

  async function handleGrant(): Promise<void> {
    if (!selectedMarketerId) {
      return;
    }

    setError(null);
    setIsGranting(true);

    try {
      const response = await fetch(
        `/api/platform/companies/${companyId}/grants`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ marketerId: selectedMarketerId }),
        },
      );

      const data: CompanyGrantItem & { error?: string } = await response.json();

      if (!response.ok) {
        setError(data.error ?? 'Не удалось выдать доступ');
        return;
      }

      setGrants((prev) => [data, ...prev]);
      setAvailableMarketers((prev) =>
        prev.filter((marketer) => marketer.id !== data.marketerId),
      );
      setSelectedMarketerId('');
    } catch (err) {
      console.error(err);
      setError('Не удалось выдать доступ');
    } finally {
      setIsGranting(false);
    }
  }

  async function handleRevoke(grant: CompanyGrantItem): Promise<void> {
    const confirmed = window.confirm(
      `Отозвать доступ маркетолога ${grant.email} к этой компании?`,
    );
    if (!confirmed) {
      return;
    }

    setError(null);
    setPendingRevokeIds((prev) => new Set(prev).add(grant.marketerId));

    try {
      const response = await fetch(
        `/api/platform/companies/${companyId}/grants/${grant.marketerId}`,
        { method: 'DELETE' },
      );

      if (!response.ok) {
        const data: { error?: string } = await response.json();
        setError(data.error ?? 'Не удалось отозвать доступ');
        return;
      }

      setGrants((prev) =>
        prev.filter((item) => item.marketerId !== grant.marketerId),
      );
      setAvailableMarketers((prev) =>
        [...prev, { id: grant.marketerId, name: grant.name, email: grant.email }].sort(
          (a, b) => a.name.localeCompare(b.name),
        ),
      );
    } catch (err) {
      console.error(err);
      setError('Не удалось отозвать доступ');
    } finally {
      setPendingRevokeIds((prev) => {
        const next = new Set(prev);
        next.delete(grant.marketerId);
        return next;
      });
    }
  }

  return (
    <section className="mb-8 rounded-[14px] border border-[0.5px] border-[var(--color-border)] bg-[var(--color-bg-surface)] p-5">
      <h2 className="mb-4 text-[20px] font-medium text-[var(--color-text-primary)]">
        Доступ маркетологов
      </h2>

      {error ? (
        <p className="mb-4 text-[12px] text-[#EF4444]" role="alert">
          {error}
        </p>
      ) : null}

      {grants.length === 0 ? (
        <p className="mb-4 text-[13px] text-[var(--color-text-secondary)]">
          Ни одному маркетологу доступ не выдан
        </p>
      ) : (
        <ul className="mb-4 flex flex-col gap-2">
          {grants.map((grant) => {
            const isRevoking = pendingRevokeIds.has(grant.marketerId);

            return (
              <li
                key={grant.marketerId}
                className="flex items-center justify-between gap-3 rounded-[8px] border border-[0.5px] border-[var(--color-border)] px-3 py-2"
              >
                <div>
                  <p className="text-[14px] text-[var(--color-text-primary)]">
                    {grant.name}
                  </p>
                  <p className="text-[12px] text-[var(--color-text-secondary)]">
                    {grant.email}
                  </p>
                </div>
                <Button
                  variant="danger"
                  size="sm"
                  disabled={isRevoking}
                  onClick={() => handleRevoke(grant)}
                >
                  {isRevoking ? 'Отзыв…' : 'Отозвать'}
                </Button>
              </li>
            );
          })}
        </ul>
      )}

      {availableMarketers.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          <div className="w-full max-w-[280px]">
            <Select
              value={selectedMarketerId}
              onChange={setSelectedMarketerId}
              placeholder="Выберите маркетолога"
              options={availableMarketers.map((marketer) => ({
                value: marketer.id,
                label: `${marketer.name} (${marketer.email})`,
              }))}
              disabled={isGranting}
            />
          </div>
          <Button
            variant="secondary"
            size="sm"
            disabled={!selectedMarketerId || isGranting}
            onClick={handleGrant}
          >
            {isGranting ? 'Выдача…' : 'Выдать доступ'}
          </Button>
        </div>
      ) : (
        <p className="text-[13px] text-[var(--color-text-secondary)]">
          Нет доступных активных маркетологов для выдачи гранта
        </p>
      )}
    </section>
  );
}
