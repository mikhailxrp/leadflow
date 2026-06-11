import type { Metadata } from 'next';
import Link from 'next/link';
import LeadsTable, { type CellType, type ManagerCell } from '@/components/blocks/LeadsTable';
import type { LeadSourceType, ListStatusType } from '@/components/ui/Badge';
import LeadsFilters from '@/components/leads/LeadsFilters';
import LeadsPagination from '@/components/leads/LeadsPagination';
import { PageContent } from '@/components/layout/AppLayout';
import PageHeader from '@/components/layout/PageHeader';
import Button from '@/components/ui/Button';

export const metadata: Metadata = {
  title: 'Лиды',
};

interface LeadRow extends Record<string, unknown> {
  id: string;
  name: string;
  phone: string;
  email: string;
  source: LeadSourceType;
  manager: ManagerCell;
  status: ListStatusType;
  date: string;
}

const MOCK_LEADS: LeadRow[] = [
  {
    id: '1',
    name: 'Александр Смирнов',
    phone: '+7 (495) 123-45-67',
    email: 'alex@company.ru',
    source: 'tilda',
    manager: { initials: 'Е', name: 'Елена В.' },
    status: 'new',
    date: 'Сегодня, 10:42',
  },
  {
    id: '2',
    name: 'Мария Иванова',
    phone: '+7 (903) 222-33-44',
    email: 'maria@mail.ru',
    source: 'yandex',
    manager: { initials: 'И', name: 'Иван К.' },
    status: 'in-progress',
    date: 'Вчера, 16:30',
  },
  {
    id: '3',
    name: 'ООО «Вектор»',
    phone: '+7 (812) 555-66-77',
    email: 'vector@ooo.ru',
    source: 'wordpress',
    manager: { initials: 'А', name: 'Алексей М.' },
    status: 'new',
    date: '12 Окт 2023',
  },
  {
    id: '4',
    name: 'Анна Петрова',
    phone: '+7 (916) 888-99-00',
    email: 'anna@test.ru',
    source: 'api',
    manager: { initials: 'Е', name: 'Елена В.' },
    status: 'success',
    date: '11 Окт 2023',
  },
  {
    id: '5',
    name: 'Дмитрий Козлов',
    phone: '+7 (925) 111-22-33',
    email: 'dmitry@corp.ru',
    source: 'tilda',
    manager: { initials: 'И', name: 'Иван К.' },
    status: 'rejected',
    date: '10 Окт 2023',
  },
  {
    id: '6',
    name: 'Екатерина Соколова',
    phone: '+7 (903) 444-55-66',
    email: 'kate@design.ru',
    source: 'yandex',
    manager: { initials: 'А', name: 'Алексей М.' },
    status: 'in-progress',
    date: '09 Окт 2023',
  },
  {
    id: '7',
    name: 'ИП Сидоров',
    phone: '+7 (495) 777-88-99',
    email: 'sidorov@ip.ru',
    source: 'wordpress',
    manager: { initials: 'Е', name: 'Елена В.' },
    status: 'success',
    date: '08 Окт 2023',
  },
  {
    id: '8',
    name: 'ЗАО «Прогресс»',
    phone: '+7 (812) 333-44-55',
    email: 'progress@zao.ru',
    source: 'api',
    manager: { initials: 'И', name: 'Иван К.' },
    status: 'new',
    date: '07 Окт 2023',
  },
];

const LEADS_COLUMNS: {
  key: keyof LeadRow;
  header: string;
  cellType: CellType;
}[] = [
  { key: 'name', header: 'Имя', cellType: 'name' },
  { key: 'phone', header: 'Телефон', cellType: 'secondary' },
  { key: 'email', header: 'Email', cellType: 'secondary' },
  { key: 'source', header: 'Источник', cellType: 'leadSource' },
  { key: 'manager', header: 'Менеджер', cellType: 'manager' },
  { key: 'status', header: 'Статус', cellType: 'listStatus' },
  { key: 'date', header: 'Дата', cellType: 'tertiary' },
];

function PlusIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  );
}

export default function LeadsPage() {
  return (
    <>
      <PageHeader
        title={
          <span className="flex items-center gap-2">
            Лиды
            <span
              className="
                rounded-[20px] bg-[var(--color-bg-surface-2)]
                px-2.5 py-0.5 text-[12px] font-medium
                text-[var(--color-text-secondary)]
              "
            >
              248
            </span>
          </span>
        }
        actions={
          <Link href="/leads/new">
            <Button variant="primary" size="md" icon={<PlusIcon />}>
              Добавить лид
            </Button>
          </Link>
        }
      />

      <PageContent>
        <div className="flex flex-col gap-4">
          <LeadsFilters />

          <LeadsTable<LeadRow>
            keyField="id"
            data={MOCK_LEADS}
            columns={LEADS_COLUMNS}
            uppercaseHeaders
            rowClickable
          />

          <LeadsPagination />
        </div>
      </PageContent>
    </>
  );
}
