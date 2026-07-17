import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import ApiKeysTable from '@/components/integrations/ApiKeysTable';
import IntegrationCard from '@/components/integrations/IntegrationCard';
import WebhookSourceCard from '@/components/integrations/WebhookSourceCard';
import YandexDirectCard from '@/components/integrations/YandexDirectCard';
import YandexMetrikaCard from '@/components/integrations/YandexMetrikaCard';
import { PageContent } from '@/components/layout/AppLayout';
import NotificationBell from '@/components/notifications/NotificationBell';
import IconButton from '@/components/ui/IconButton';
import Avatar from '@/components/ui/Avatar';
import { hasMinRole } from '@/constants/roles';
import { listApiKeys } from '@/lib/apiKeys/listApiKeys';
import { auth } from '@/lib/auth';
import { toCompanyActor } from '@/lib/auth/requireCompanyAccess';
import { getSourceHealth } from '@/lib/integrations/getSourceHealth';
import { getWebhookUrls } from '@/lib/integrations/getWebhookUrls';
import { getMetrikaConnectionStatus } from '@/lib/integrations/yandex/metrikaOauth';
import { getYandexConnectionStatus } from '@/lib/integrations/yandex/oauth';
import { prisma } from '@/lib/prisma';
import { getSettings } from '@/lib/settings/getSettings';
import type { CompanySession } from '@/types/session';

function computeInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].charAt(0).toUpperCase();
  return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
}

export const metadata: Metadata = {
  title: 'Интеграции',
};

function SearchIcon() {
  return (
    <svg
      className="h-5 w-5 text-[var(--color-text-secondary)]"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.75}
        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
      />
    </svg>
  );
}

function TildaIcon() {
  return (
    <div
      className="
        flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg
        bg-[#d1fae5]
      "
      aria-hidden="true"
    >
      <svg
        className="h-5 w-5 text-[#10b981]"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.75}
          d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z"
        />
      </svg>
    </div>
  );
}

function WordPressIcon() {
  return (
    <div
      className="
        flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg
        bg-[#EFF6FF]
      "
      aria-hidden="true"
    >
      <svg
        className="h-5 w-5 text-[#3b82f6]"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.75}
          d="M12 22v-5M9 8V2M15 8V2M7 8h10a2 2 0 012 2v4a6 6 0 01-6 6 6 6 0 01-6-6v-4a2 2 0 012-2z"
        />
      </svg>
    </div>
  );
}

function WebhookIcon() {
  return (
    <div
      className="
        flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg
        bg-[#F5F3FF]
      "
      aria-hidden="true"
    >
      <svg
        className="h-5 w-5 text-[#8b5cf6]"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <circle cx="6" cy="12" r="2" strokeWidth={1.75} />
        <circle cx="18" cy="6" r="2" strokeWidth={1.75} />
        <circle cx="18" cy="18" r="2" strokeWidth={1.75} />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.75}
          d="M8 11l8-4M8 13l8 4"
        />
      </svg>
    </div>
  );
}

export default async function AdminIntegrationsPage() {
  const session = await auth();
  if (!session || session.kind !== 'company') {
    redirect('/login');
  }

  const actor = toCompanyActor(session as CompanySession);

  if (actor.actor === 'user' && !hasMinRole(actor.role, 'ADMIN')) {
    redirect('/today');
  }

  const { companyId } = actor;

  const [dbUser, apiKeys, sourceHealth, settings, yandexStatus, metrikaStatus] = await Promise.all([
    actor.actor === 'user'
      ? prisma.user.findUnique({
          where: { id: actor.userId, companyId },
          select: { name: true, avatarUrl: true },
        })
      : Promise.resolve(null),
    listApiKeys(companyId),
    getSourceHealth(companyId),
    getSettings(companyId),
    getYandexConnectionStatus(companyId),
    getMetrikaConnectionStatus(companyId),
  ]);

  const userName = dbUser?.name ?? '';
  const userInitials = computeInitials(userName);
  const yandexMode = settings.yandexMode ?? 'UTM';
  const isMarketer = actor.actor === 'marketer';

  const initialApiKeys = apiKeys.map((key) => ({
    ...key,
    createdAt: key.createdAt.toISOString(),
  }));

  const webhookUrls = getWebhookUrls(companyId);
  const tildaHealth = sourceHealth.find((entry) => entry.type === 'tilda');
  const wordpressHealth = sourceHealth.find((entry) => entry.type === 'wordpress');
  const apiHealth = sourceHealth.filter((entry) => entry.type === 'api');

  return (
    <>
      <header
        className="
          sticky top-0 z-30 flex h-[56px] flex-shrink-0 items-center justify-between
          border-b border-[var(--color-border)] border-[0.5px]
          bg-[var(--color-bg-surface)] px-6
        "
      >
        <nav
          className="text-[13px] text-[var(--color-text-secondary)]"
          aria-label="Хлебные крошки"
        >
          Настройки / Интеграции
        </nav>

        <div className="flex items-center gap-3">
          <IconButton aria-label="Поиск" icon={<SearchIcon />} />
          {!isMarketer && <NotificationBell />}
          {!isMarketer && (
            <Avatar initials={userInitials} src={dbUser?.avatarUrl ?? undefined} size="sm" />
          )}
        </div>
      </header>

      <PageContent>
        <div className="mb-6">
          <h1 className="text-[28px] font-medium tracking-[-0.01em] text-[var(--color-text-primary)]">
            Интеграции
          </h1>
          <p className="mt-1 text-[14px] text-[var(--color-text-secondary)]">
            Управляйте подключениями к внешним сервисам и сайтам.
          </p>
        </div>

        <div className="flex flex-col gap-4">
          <WebhookSourceCard
            sourceKey="tilda"
            icon={<TildaIcon />}
            title="Tilda"
            description="В настройках формы Tilda укажите адрес вебхука:"
            webhookUrl={webhookUrls?.tildaUrl ?? null}
            health={tildaHealth}
            initialEnabled={settings.sourceEnabled.tilda}
            readOnly={isMarketer}
          />

          <WebhookSourceCard
            sourceKey="wordpress"
            icon={<WordPressIcon />}
            title="WordPress"
            description="Установите плагин Contact Form 7, WPForms или Gravity Forms и укажите вебхук:"
            extraNote={
              <p className="mt-3 text-[12px] text-[var(--color-text-tertiary)]">
                Поддерживаются: Contact Form 7, WPForms, Gravity Forms
              </p>
            }
            webhookUrl={webhookUrls?.wordpressUrl ?? null}
            health={wordpressHealth}
            initialEnabled={settings.sourceEnabled.wordpress}
            readOnly={isMarketer}
          />

          <YandexDirectCard
            initialMode={yandexMode}
            initialConnected={yandexStatus.connected}
            initialLogin={yandexStatus.login}
            readOnly={isMarketer}
          />

          <YandexMetrikaCard
            initialConnected={metrikaStatus.connected}
            initialLogin={metrikaStatus.login}
            initialCounterId={settings.yandexMetrika?.counterId ?? ''}
            initialGoalId={settings.yandexMetrika?.qualifiedGoalId ?? ''}
            isMarketer={isMarketer}
          />

          <IntegrationCard
            icon={<WebhookIcon />}
            title="Универсальный Webhook"
            subtitle="Подключите любой сайт или форму через API-ключ"
          >
            <ApiKeysTable initialApiKeys={initialApiKeys} sourceHealth={apiHealth} />
          </IntegrationCard>
        </div>
      </PageContent>
    </>
  );
}
