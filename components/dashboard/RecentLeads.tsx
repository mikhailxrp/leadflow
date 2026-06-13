'use client';

import Link from 'next/link';
import LeadsTable from '@/components/blocks/LeadsTable';
import { StatusBadge } from '@/components/ui/Badge';

type LeadStatus = 'new' | 'contact' | 'in-progress' | 'warm' | 'deal';

interface RecentLeadRow extends Record<string, unknown> {
  id: string;
  name: string;
  source: string;
  status: LeadStatus;
  date: string;
}

const MOCK_LEADS: RecentLeadRow[] = [
  {
    id: '1',
    name: 'Иван Иванов',
    source: 'Входящий звонок',
    status: 'new',
    date: '07.06.2026',
  },
  {
    id: '2',
    name: 'ООО «Вектор»',
    source: 'Сайт',
    status: 'contact',
    date: '07.06.2026',
  },
  {
    id: '3',
    name: 'Анна Смирнова',
    source: 'Telegram',
    status: 'in-progress',
    date: '06.06.2026',
  },
  {
    id: '4',
    name: 'ИП Петров',
    source: 'Рекомендация',
    status: 'warm',
    date: '06.06.2026',
  },
  {
    id: '5',
    name: 'ЗАО «Альянс»',
    source: 'Email',
    status: 'deal',
    date: '05.06.2026',
  },
];

export default function RecentLeads() {
  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-[14px] font-medium text-[var(--color-text-primary)]">
          Последние лиды
        </h2>
        <Link
          href="/leads"
          className="text-[13px] text-[var(--color-text-secondary)] transition-colors duration-150 hover:text-[var(--color-text-primary)]"
        >
          Все лиды →
        </Link>
      </div>

      <LeadsTable<RecentLeadRow>
        keyField="id"
        data={MOCK_LEADS}
        rowClickable
        columns={[
          {
            key: 'name',
            header: 'Имя',
            render: (row) => (
              <span className="font-medium">{row.name}</span>
            ),
          },
          { key: 'source', header: 'Источник' },
          {
            key: 'status',
            header: 'Статус',
            render: (row) => <StatusBadge status={row.status} />,
          },
          { key: 'date', header: 'Дата' },
        ]}
      />
    </section>
  );
}
