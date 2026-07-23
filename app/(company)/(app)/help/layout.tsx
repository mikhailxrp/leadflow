import { type ReactNode } from 'react';
import { Icon } from '@iconify/react';
import NotificationBell from '@/components/notifications/NotificationBell';
import HelpNav, { type HelpNavItem } from '@/components/help/HelpNav';
import { HELP_DOCS } from '@/lib/help/content';
import { auth } from '@/lib/auth';

const NAV_ITEMS: HelpNavItem[] = [
  { href: '/help', label: 'Обзор', icon: 'lucide:compass' },
  ...HELP_DOCS.map((doc) => ({
    href: `/help/${doc.slug}`,
    label: doc.title,
    icon: doc.icon,
  })),
];

export default async function HelpLayout({
  children,
}: {
  children: ReactNode;
}): Promise<ReactNode> {
  const session = await auth();
  const showBell = session?.kind === 'company' && Boolean(session.user);

  return (
    <>
      <header
        className="
          sticky top-0 z-30 flex h-[56px] flex-shrink-0 items-center justify-between
          border-b-[0.5px] border-[var(--color-border)] print:hidden
          bg-[var(--color-bg-surface)] px-4 sm:px-6
        "
      >
        <div className="flex items-center gap-2 text-[var(--color-text-primary)]">
          <Icon icon="lucide:life-buoy" className="h-[18px] w-[18px] text-[var(--color-primary)]" />
          <span className="text-[15px] font-semibold">Помощь</span>
        </div>
        {showBell && (
          <div className="flex items-center gap-3">
            <NotificationBell />
          </div>
        )}
      </header>

      <div className="min-h-0 flex-1 overflow-auto print:h-auto print:overflow-visible">
        <div className="mx-auto flex w-full max-w-[1240px] gap-8 px-4 py-6 sm:px-6 lg:py-8 print:block print:max-w-none print:px-0 print:py-0">
          <aside className="hidden w-[220px] flex-shrink-0 print:hidden lg:block">
            <div className="sticky top-8">
              <HelpNav items={NAV_ITEMS} />
            </div>
          </aside>

          <div className="min-w-0 flex-1">
            <div className="mb-6 print:hidden lg:hidden">
              <HelpNav items={NAV_ITEMS} variant="mobile" />
            </div>
            {children}
          </div>
        </div>
      </div>
    </>
  );
}
