import Link from 'next/link';
import type { ReactNode } from 'react';
import Avatar from '@/components/ui/Avatar';
import type { TeamMemberListItem } from '@/types/users';

interface TeamTableProps {
  members: TeamMemberListItem[];
}

const ROLE_LABELS: Record<TeamMemberListItem['role'], string> = {
  ADMIN: 'Администратор',
  HEAD: 'Руководитель',
  MANAGER: 'Менеджер',
};

const ROLE_BADGE_CLASS: Record<TeamMemberListItem['role'], string> = {
  ADMIN: 'bg-[#D1FAE5] text-[#065F46]',
  HEAD: 'bg-[#DBEAFE] text-[#1E40AF]',
  MANAGER: 'bg-[var(--color-bg-surface-2)] text-[var(--color-text-secondary)]',
};

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function StatusCell({ isBlocked }: { isBlocked: boolean }): ReactNode {
  return (
    <div className="flex items-center gap-2">
      <span
        className={`h-1.5 w-1.5 shrink-0 rounded-full ${!isBlocked ? 'bg-[#10B981]' : 'bg-[#94A3B8]'}`}
        aria-hidden="true"
      />
      <span
        className={`text-[13px] ${!isBlocked ? 'text-[var(--color-text-primary)]' : 'text-[var(--color-text-tertiary)]'}`}
      >
        {!isBlocked ? 'Активен' : 'Заблокирован'}
      </span>
    </div>
  );
}

const TABLE_COLUMNS = ['СОТРУДНИК', 'EMAIL', 'РОЛЬ', 'СТАТУС'] as const;

export default function TeamTable({ members }: TeamTableProps): ReactNode {
  return (
    <>
      <h1 className="mb-6 text-[28px] font-medium tracking-[-0.01em] text-[var(--color-text-primary)]">
        Команда
      </h1>

      <div className="overflow-hidden rounded-lg border-[0.5px] border-[var(--color-border)] bg-[var(--color-bg-surface)]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse">
            <thead>
              <tr className="border-b-[0.5px] border-[var(--color-border)]">
                {TABLE_COLUMNS.map((column) => (
                  <th
                    key={column}
                    className="px-4 py-3 text-left text-[11px] font-medium tracking-[0.05em] text-[var(--color-text-secondary)] uppercase"
                  >
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {members.length === 0 ? (
                <tr>
                  <td
                    colSpan={TABLE_COLUMNS.length}
                    className="px-4 py-8 text-center text-[14px] text-[var(--color-text-secondary)]"
                  >
                    Нет сотрудников
                  </td>
                </tr>
              ) : (
                members.map((member) => (
                  <tr
                    key={member.id}
                    className="
                      border-b-[0.5px] border-[var(--color-border)]
                      last:border-0 transition-colors duration-150
                      hover:bg-[var(--color-bg-surface-2)]
                    "
                  >
                    <td className="p-0">
                      <Link
                        href={`/team/${member.id}`}
                        className="flex items-center gap-3 px-4 py-3"
                      >
                        <Avatar
                          initials={getInitials(member.name)}
                          src={member.avatarUrl ?? undefined}
                          size="sm"
                        />
                        <span className="text-[14px] font-medium text-[var(--color-text-primary)]">
                          {member.name}
                        </span>
                      </Link>
                    </td>
                    <td className="p-0">
                      <Link
                        href={`/team/${member.id}`}
                        className="block px-4 py-3 text-[13px] text-[var(--color-text-secondary)]"
                      >
                        {member.email}
                      </Link>
                    </td>
                    <td className="p-0">
                      <Link href={`/team/${member.id}`} className="block px-4 py-3">
                        <span
                          className={`inline-flex rounded-[20px] px-2.5 py-1 text-[12px] font-medium ${ROLE_BADGE_CLASS[member.role]}`}
                        >
                          {ROLE_LABELS[member.role]}
                        </span>
                      </Link>
                    </td>
                    <td className="p-0">
                      <Link href={`/team/${member.id}`} className="block px-4 py-3">
                        <StatusCell isBlocked={member.isBlocked} />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
