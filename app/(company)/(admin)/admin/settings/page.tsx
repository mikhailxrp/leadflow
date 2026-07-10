import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { PageContent } from '@/components/layout/AppLayout';
import NotificationBell from '@/components/notifications/NotificationBell';
import SettingsSections, { SettingsDirtyProvider } from '@/components/settings/SettingsClientArea';
import SystemSection from '@/components/settings/SystemSection';
import LossReasonsSection from '@/components/settings/LossReasonsSection';
import AssignModeSection from '@/components/settings/AssignModeSection';
import AssignmentRulesSection from '@/components/settings/AssignmentRulesSection';
import NotificationsSection from '@/components/settings/NotificationsSection';
import { hasMinRole } from '@/constants/roles';
import { DEFAULT_COMPANY_SETTINGS } from '@/constants/defaultCompanyData';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

function readAssignMode(settings: unknown): 'MANUAL' | 'ROUND_ROBIN' {
  if (settings && typeof settings === 'object' && !Array.isArray(settings)) {
    const mode = (settings as Record<string, unknown>).assignMode;
    if (mode === 'ROUND_ROBIN') return 'ROUND_ROBIN';
  }
  return 'MANUAL'; // отсутствующие/битые настройки → MANUAL, не исключение
}

function readTelegramEnabled(settings: unknown): boolean {
  if (settings && typeof settings === 'object' && !Array.isArray(settings)) {
    const value = (settings as Record<string, unknown>).telegramEnabled;
    if (typeof value === 'boolean') return value;
  }
  return DEFAULT_COMPANY_SETTINGS.telegramEnabled;
}

export const metadata: Metadata = {
  title: 'Настройки',
};

export default async function AdminSettingsPage() {
  const session = await auth();
  if (!session || session.kind !== 'company' || !session.user) {
    redirect('/login');
  }

  if (!hasMinRole(session.user.role, 'ADMIN')) {
    redirect('/today');
  }

  const { companyId } = session.user;

  const ASSIGNEE_SELECT = { id: true, name: true } as const;

  const [company, lossReasonsRaw, assignmentRules, users] = await Promise.all([
    prisma.company.findUniqueOrThrow({
      where: { id: companyId },
      select: { name: true, nextPaymentAt: true, settings: true },
    }),
    prisma.lossReason.findMany({
      where: { companyId },
      orderBy: { order: 'asc' },
      select: {
        id: true,
        label: true,
        order: true,
        _count: { select: { leads: true } },
      },
    }),
    prisma.assignmentRule.findMany({
      where: { companyId },
      orderBy: { priority: 'asc' },
      select: {
        id: true,
        matchSource: true,
        matchSourceLabel: true,
        priority: true,
        isActive: true,
        assignTo: { select: ASSIGNEE_SELECT },
        fallbackTo: { select: ASSIGNEE_SELECT },
      },
    }),
    prisma.user.findMany({
      where: { companyId },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, isBlocked: true },
    }),
  ]);

  const lossReasons = lossReasonsRaw.map(({ _count, ...rest }) => ({
    ...rest,
    inUse: _count.leads > 0,
  }));

  return (
    <>
      <header
        className="
          sticky top-0 z-30 flex h-[56px] flex-shrink-0 items-center justify-between
          border-b-[0.5px] border-[var(--color-border)]
          bg-[var(--color-bg-surface)] px-6
        "
      >
        <h1 className="text-[15px] font-medium text-[var(--color-text-primary)]">Настройки</h1>

        <div className="flex items-center gap-3">
          <NotificationBell />
        </div>
      </header>

      <PageContent>
        <div className="mx-auto flex w-full max-w-[720px] flex-col gap-4">
          <LossReasonsSection initialReasons={lossReasons} />
          <AssignModeSection initialAssignMode={readAssignMode(company.settings)} />
          <AssignmentRulesSection initialRules={assignmentRules} users={users} />
          <NotificationsSection initialTelegramEnabled={readTelegramEnabled(company.settings)} />
          <SettingsDirtyProvider>
            <SettingsSections />
            <SystemSection companyName={company.name} nextPaymentAt={company.nextPaymentAt} />
          </SettingsDirtyProvider>
        </div>
      </PageContent>
    </>
  );
}
