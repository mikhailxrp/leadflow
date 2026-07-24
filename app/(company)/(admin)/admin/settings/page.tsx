import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { PageContent } from '@/components/layout/AppLayout';
import MobileMenuButton from '@/components/layout/MobileMenuButton';
import NotificationBell from '@/components/notifications/NotificationBell';
import SettingsSections, { SettingsDirtyProvider } from '@/components/settings/SettingsClientArea';
import SystemSection from '@/components/settings/SystemSection';
import LossReasonsSection from '@/components/settings/LossReasonsSection';
import AssignModeSection from '@/components/settings/AssignModeSection';
import AssignmentRulesSection from '@/components/settings/AssignmentRulesSection';
import NotificationsSection from '@/components/settings/NotificationsSection';
import ControlSection from '@/components/settings/ControlSection';
import ReactionNormOverridesTable from '@/components/settings/ReactionNormOverridesTable';
import WorkHoursForm from '@/components/settings/WorkHoursForm';
import { hasMinRole } from '@/constants/roles';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getSettings } from '@/lib/settings/getSettings';

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

  const [company, lossReasonsRaw, assignmentRules, users, stages, sourceRows, settings] = await Promise.all([
    prisma.company.findUniqueOrThrow({
      where: { id: companyId },
      select: { name: true, nextPaymentAt: true },
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
    prisma.pipelineStage.findMany({
      where: { companyId },
      orderBy: { order: 'asc' },
      select: { id: true, name: true },
    }),
    prisma.integrationSource.findMany({
      where: { companyId },
      distinct: ['type'],
      select: { type: true },
    }),
    getSettings(companyId),
  ]);

  const lossReasons = lossReasonsRaw.map(({ _count, ...rest }) => ({
    ...rest,
    inUse: _count.leads > 0,
  }));

  const knownSources = sourceRows.map((row) => row.type);

  return (
    <>
      <header
        className="
          sticky top-0 z-30 flex h-[56px] flex-shrink-0 items-center justify-between
          border-b-[0.5px] border-[var(--color-border)]
          bg-[var(--color-bg-surface)] px-4 sm:px-6
        "
      >
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <MobileMenuButton />
          <h1 className="truncate text-[15px] font-medium text-[var(--color-text-primary)]">
            Настройки
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <NotificationBell />
        </div>
      </header>

      <PageContent>
        <div className="flex w-full flex-col gap-4">
          <LossReasonsSection initialReasons={lossReasons} />
          <AssignModeSection initialAssignMode={settings.assignMode} />
          <AssignmentRulesSection initialRules={assignmentRules} users={users} />
          <NotificationsSection initialTelegramEnabled={settings.telegramEnabled} />
          <ControlSection
            initialFields={{
              controlEnabled: settings.controlEnabled,
              defaultMinutes: settings.reactionNorms.defaultMinutes,
              reminderBeforePercent: settings.reactionNorms.reminderBeforePercent,
              escalateAfterPercent: settings.reactionNorms.escalateAfterPercent,
              stageStuckDaysDefault: settings.stageStuckDaysDefault,
              stuckCheckTime: settings.stuckCheckTime,
              sourceHealthThresholdHours: settings.sourceHealthThresholdHours,
            }}
          />
          <ReactionNormOverridesTable
            initialBySource={settings.reactionNorms.bySource ?? {}}
            initialByStage={settings.reactionNorms.byStage ?? {}}
            initialByUser={settings.reactionNorms.byUser ?? {}}
            stages={stages}
            users={users}
            knownSources={knownSources}
          />
          <WorkHoursForm
            initialWorkHoursOnly={settings.reactionNorms.workHoursOnly}
            initialWorkHours={settings.workHours ?? null}
          />
          <SettingsDirtyProvider>
            <SettingsSections />
            <SystemSection companyName={company.name} nextPaymentAt={company.nextPaymentAt} />
          </SettingsDirtyProvider>
        </div>
      </PageContent>
    </>
  );
}
