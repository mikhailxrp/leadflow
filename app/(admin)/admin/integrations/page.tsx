import type { Metadata } from 'next';
import IntegrationCard from '@/components/integrations/IntegrationCard';
import ApiKeysTable from '@/components/integrations/ApiKeysTable';
import WebhookUrl from '@/components/integrations/WebhookUrl';
import YandexDirectCard from '@/components/integrations/YandexDirectCard';
import { PageContent } from '@/components/layout/AppLayout';
import NotificationBell from '@/components/notifications/NotificationBell';
import IconButton from '@/components/ui/IconButton';
import Avatar from '@/components/ui/Avatar';

export const metadata: Metadata = {
  title: 'Интеграции',
};

const WEBHOOK_TILDA_URL = 'https://lidkanal.ru/api/webhooks/tilda';
const WEBHOOK_WORDPRESS_URL = 'https://lidkanal.ru/api/webhooks/wordpress';

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

function ConnectedBadge() {
  return (
    <span
      className="
        inline-flex flex-shrink-0 items-center rounded-[20px]
        bg-[#d1fae5] px-2.5 py-1 text-[12px] font-medium text-[#065f46]
      "
    >
      Подключено
    </span>
  );
}

function NotConfiguredBadge() {
  return (
    <span
      className="
        inline-flex flex-shrink-0 items-center rounded-[20px]
        bg-[var(--color-bg-surface-2)] px-2.5 py-1
        text-[12px] font-medium text-[var(--color-text-secondary)]
      "
    >
      Не настроено
    </span>
  );
}

export default function AdminIntegrationsPage() {
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
          <NotificationBell />
          <Avatar initials="АА" size="sm" />
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
          <IntegrationCard
            icon={<TildaIcon />}
            title="Tilda"
            badge={<ConnectedBadge />}
            description="В настройках формы Tilda укажите адрес вебхука:"
          >
            <WebhookUrl url={WEBHOOK_TILDA_URL} />
          </IntegrationCard>

          <IntegrationCard
            icon={<WordPressIcon />}
            title="WordPress"
            badge={<NotConfiguredBadge />}
            description="Установите плагин Contact Form 7, WPForms или Gravity Forms и укажите вебхук:"
            footer={
              <p className="mt-3 text-[12px] text-[var(--color-text-tertiary)]">
                Поддерживаются: Contact Form 7, WPForms, Gravity Forms
              </p>
            }
          >
            <WebhookUrl url={WEBHOOK_WORDPRESS_URL} />
          </IntegrationCard>

          <YandexDirectCard />

          <IntegrationCard
            icon={<WebhookIcon />}
            title="Универсальный Webhook"
            subtitle="Подключите любой сайт или форму через API-ключ"
          >
            <ApiKeysTable />
          </IntegrationCard>
        </div>
      </PageContent>
    </>
  );
}
