'use client';

import type { JSX } from 'react';
import Card from '@/components/ui/Card';

export default function LeadsChart(): JSX.Element {
  return (
    <Card padding="lg">
      <h2 className="mb-4 text-[14px] font-medium text-[var(--color-text-primary)]">
        Лиды по дням
      </h2>
      <div className="flex h-[220px] items-center justify-center">
        <p className="text-[13px] text-[var(--color-text-secondary)]">Пока нет данных</p>
      </div>
    </Card>
  );
}
