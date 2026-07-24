'use client';

import { Icon } from '@iconify/react';
import { useRouter } from 'next/navigation';
import { useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Toast from '@/components/ui/Toast';

interface YandexMetrikaCardProps {
  initialConnected: boolean;
  initialLogin: string | null;
  initialCounterId: string;
  initialGoalId: string;
  isMarketer: boolean;
}

function MetrikaIcon(): ReactNode {
  return (
    <div
      className="
        flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md
        bg-[#F97316]
      "
      aria-hidden="true"
    >
      <span className="text-[14px] font-bold text-white">М</span>
    </div>
  );
}

function ConnectedBadge(): ReactNode {
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

function NotConnectedBadge(): ReactNode {
  return (
    <span
      className="
        inline-flex flex-shrink-0 items-center rounded-[20px]
        border border-[var(--color-border)] border-[0.5px]
        bg-[var(--color-bg-surface-2)] px-2.5 py-1
        text-[12px] font-medium text-[var(--color-text-secondary)]
      "
    >
      Не подключено
    </span>
  );
}

export default function YandexMetrikaCard({
  initialConnected,
  initialLogin,
  initialCounterId,
  initialGoalId,
  isMarketer,
}: YandexMetrikaCardProps): ReactNode {
  const router = useRouter();
  const [connected, setConnected] = useState(initialConnected);
  const [login, setLogin] = useState(initialLogin);
  const [counterId, setCounterId] = useState(initialCounterId);
  const [goalId, setGoalId] = useState(initialGoalId);
  const [counterIdDraft, setCounterIdDraft] = useState(initialCounterId);
  const [goalIdDraft, setGoalIdDraft] = useState(initialGoalId);
  const [disconnecting, setDisconnecting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const goalReady = counterId.trim() !== '' && goalId.trim() !== '';
  const exportActive = connected && goalReady;

  async function handleDisconnect(): Promise<void> {
    if (isMarketer || disconnecting) return;

    setDisconnecting(true);
    try {
      const response = await fetch('/api/integrations/yandex/metrika', { method: 'DELETE' });

      if (!response.ok) {
        setToast('Не удалось отключить счётчик Метрики');
        return;
      }

      setConnected(false);
      setLogin(null);
      router.refresh();
    } catch (error) {
      console.error('Failed to disconnect Yandex Metrika:', error);
      setToast('Не удалось отключить счётчик Метрики');
    } finally {
      setDisconnecting(false);
    }
  }

  async function handleSaveSettings(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (saving) return;

    const trimmedCounterId = counterIdDraft.trim();
    const trimmedGoalId = goalIdDraft.trim();
    if (!trimmedCounterId || !trimmedGoalId) {
      setToast('Заполните номер счётчика и идентификатор цели');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/integrations/yandex/metrika', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ counterId: trimmedCounterId, qualifiedGoalId: trimmedGoalId }),
      });

      if (!response.ok) {
        setToast('Не удалось сохранить настройку Метрики');
        return;
      }

      setCounterId(trimmedCounterId);
      setGoalId(trimmedGoalId);
      setCounterIdDraft(trimmedCounterId);
      setGoalIdDraft(trimmedGoalId);
      router.refresh();
    } catch (error) {
      console.error('Failed to save Yandex Metrika settings:', error);
      setToast('Не удалось сохранить настройку Метрики');
    } finally {
      setSaving(false);
    }
  }

  const statusMessage = exportActive
    ? 'Экспорт активен — квалифицированные лиды выгружаются по расписанию.'
    : !connected && !goalReady
      ? 'Подключите кабинет и заполните счётчик и цель, чтобы начать экспорт.'
      : !connected
        ? 'Настройка сохранена. Подключите кабинет, чтобы начать экспорт.'
        : 'Кабинет подключён. Заполните счётчик и цель, чтобы начать экспорт.';

  return (
    <Card padding="none" className="p-6">
      <div className="mb-4 flex flex-wrap items-start gap-x-4 gap-y-3">
        <div className="flex min-w-0 items-start gap-3">
          <MetrikaIcon />
          <h2 className="text-[15px] font-medium text-[var(--color-text-primary)]">
            Яндекс.Метрика — экспорт квалификаций
          </h2>
        </div>
        <div className="ml-auto flex-shrink-0">
          {connected ? <ConnectedBadge /> : <NotConnectedBadge />}
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <p className="text-[13px] text-[var(--color-text-secondary)]">
          Лиды со статусом «Целевой» батчем выгружаются в Метрику как офлайн-конверсии
          на выбранную цель — это помогает алгоритмам Директа искать похожих.
        </p>

        <div className="flex flex-wrap items-center gap-3">
          {connected ? (
            <>
              <span className="text-[13px] text-[var(--color-text-primary)]">
                Подключено{login ? `: ${login}` : ''}
              </span>
              {!isMarketer && (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={disconnecting}
                  onClick={handleDisconnect}
                >
                  Отключить
                </Button>
              )}
            </>
          ) : isMarketer ? (
            <span className="text-[13px] text-[var(--color-text-secondary)]">
              Кабинет не подключён.
            </span>
          ) : (
            <a
              href="/api/integrations/yandex/metrika/authorize"
              className="
                inline-flex min-h-[36px] w-full items-center justify-center gap-2 rounded-[6px]
                border border-transparent bg-[#10B981] px-[14px] py-2 text-center
                text-[13px] font-medium text-white
                transition-all duration-150
                hover:bg-[#0E9E6E] sm:w-auto
              "
            >
              Подключить Метрику
              <Icon icon="tabler:external-link" className="h-4 w-4 flex-shrink-0" />
            </a>
          )}
        </div>

        <p className="text-[12px] text-[var(--color-text-tertiary)]">{statusMessage}</p>

        <form
          onSubmit={handleSaveSettings}
          className="
            flex flex-col gap-3 rounded-[6px] border border-[var(--color-border)]
            border-[0.5px] bg-[var(--color-bg-surface-2)] p-3
          "
        >
          <p className="text-[13px] font-medium text-[var(--color-text-primary)]">
            Настройка выгрузки
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="flex-1">
              <Input
                label="Номер счётчика"
                placeholder="12345678"
                value={counterIdDraft}
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  setCounterIdDraft(event.target.value)
                }
              />
            </div>
            <div className="flex-1">
              <Input
                label="Идентификатор цели (JS-событие)"
                placeholder="qualified_lead"
                value={goalIdDraft}
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  setGoalIdDraft(event.target.value)
                }
              />
            </div>
          </div>
          <p className="text-[12px] text-[var(--color-text-tertiary)]">
            Цель типа «JavaScript-событие» нужно создать в самой Метрике заранее
            («Цели» → «Добавить цель»). Идентификатор — латиница/цифры без пробелов и
            спецсимволов, например <code className="font-mono">qualified_lead</code>.
          </p>
          <div>
            <Button type="submit" variant="secondary" size="sm" disabled={saving}>
              {saving ? 'Сохранение…' : 'Сохранить'}
            </Button>
          </div>
        </form>

        <div
          className="
            rounded-[6px] border border-[var(--color-border)]
            border-[0.5px] bg-[var(--color-bg-surface-2)] p-3
          "
        >
          <p className="text-[13px] font-medium text-[var(--color-text-primary)]">
            Настройка формы на сайте
          </p>
          <p className="mt-1 text-[12px] text-[var(--color-text-secondary)]">
            Без этого лиды по-прежнему сохраняются, но выгрузить их в Метрику будет не
            из чего — нужен идентификатор посетителя. Передайте разработчику сайта:
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-4 text-[12px] text-[var(--color-text-secondary)]">
            <li>
              <code className="font-mono text-[var(--color-text-primary)]">yclid</code>{' '}
              — уже подхватывается автоматически из ссылки клика по объявлению Директа,
              дополнительных настроек не требует.
            </li>
            <li>
              <code className="font-mono text-[var(--color-text-primary)]">client_id</code>{' '}
              — новое скрытое поле формы для визитов без клика по рекламе: заполняется
              JS-сниппетом Метрики (
              <code className="font-mono">
                ym(counterId, &apos;getClientID&apos;, callback)
              </code>
              ), значение кладётся в поле с этим именем.
            </li>
          </ul>

          <p
            className="
              mt-3 rounded-[6px] border border-[#FDE68A]
              bg-[#FFFBEB] p-2 text-[12px] text-[#92400E]
            "
          >
            <strong>Важно:</strong> Метрика сопоставляет офлайн-конверсию с визитом,
            если с момента последнего визита пользователя до обработки данных прошло не
            больше 21 дня — это стандартное поведение для всех счётчиков, включать
            ничего дополнительно в самой Метрике не нужно.
          </p>
        </div>
      </div>

      {toast && <Toast title={toast} onClose={() => setToast(null)} />}
    </Card>
  );
}
