'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent, type ReactNode } from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { createCompanySchema } from '@/lib/validations/platform';

interface CreateCompanyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type FieldErrors = {
  name?: string;
  adminEmail?: string;
};

type Step = 'form' | 'success';

export default function CreateCompanyModal({
  isOpen,
  onClose,
}: CreateCompanyModalProps): ReactNode {
  const router = useRouter();
  const [step, setStep] = useState<Step>('form');
  const [name, setName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [inviteUrl, setInviteUrl] = useState('');
  const [copied, setCopied] = useState(false);

  function resetState(): void {
    setStep('form');
    setName('');
    setAdminEmail('');
    setFieldErrors({});
    setServerError(null);
    setIsSubmitting(false);
    setInviteUrl('');
    setCopied(false);
  }

  function handleClose(): void {
    resetState();
    onClose();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setServerError(null);
    setFieldErrors({});

    const parsed = createCompanySchema.safeParse({
      name: name.trim(),
      adminEmail: adminEmail.trim(),
    });

    if (!parsed.success) {
      const nextFieldErrors: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0];
        if (field === 'name' || field === 'adminEmail') {
          nextFieldErrors[field] = issue.message;
        }
      }
      setFieldErrors(nextFieldErrors);
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/platform/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed.data),
      });

      const data: { inviteUrl?: string; error?: string } = await response.json();

      if (!response.ok) {
        setServerError(data.error ?? 'Не удалось создать компанию');
        return;
      }

      if (!data.inviteUrl) {
        setServerError('Сервер не вернул ссылку приглашения');
        return;
      }

      setInviteUrl(data.inviteUrl);
      setStep('success');
      // Освежаем список сразу после создания, пока модалка ещё показывает
      // ссылку-приглашение: иначе при закрытии окна фоном/Escape (минуя кнопку
      // «Готово») список останется старым до ручной перезагрузки страницы.
      router.refresh();
    } catch (error) {
      console.error(error);
      setServerError('Не удалось создать компанию');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCopy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
    } catch (error) {
      console.error('Failed to copy invite URL:', error);
    }
  }

  function handleDone(): void {
    resetState();
    onClose();
  }

  if (!isOpen) {
    return null;
  }

  return (
    <Modal onClose={handleClose} dialogClassName="max-w-[480px] rounded-[12px]">
      {step === 'form' ? (
        <>
          <h2 className="text-[16px] font-medium text-[var(--color-text-primary)]">
            Создать компанию
          </h2>
          <p className="mt-1 text-[13px] text-[var(--color-text-secondary)]">
            Укажите название и email первого администратора
          </p>

          <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-4">
            <Input
              label="Название компании"
              placeholder="ООО Ромашка"
              value={name}
              onChange={(event) => setName(event.target.value)}
              error={fieldErrors.name}
              autoFocus
            />

            <Input
              label="Email администратора"
              type="email"
              placeholder="admin@example.com"
              value={adminEmail}
              onChange={(event) => setAdminEmail(event.target.value)}
              error={fieldErrors.adminEmail}
            />

            {serverError && (
              <p className="text-[12px] text-[#EF4444]" role="alert">
                {serverError}
              </p>
            )}

            <div className="mt-1 flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={handleClose}>
                Отмена
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Создание…' : 'Создать'}
              </Button>
            </div>
          </form>
        </>
      ) : (
        <>
          <h2 className="text-[16px] font-medium text-[var(--color-text-primary)]">
            Компания создана
          </h2>
          <p className="mt-1 text-[13px] text-[var(--color-text-secondary)]">
            Отправьте ссылку первому администратору
          </p>

          <div className="mt-5 flex flex-col gap-2">
            <label
              htmlFor="invite-url"
              className="text-[12px] text-[var(--color-text-secondary)]"
            >
              Ссылка приглашения
            </label>
            <input
              id="invite-url"
              type="text"
              readOnly
              value={inviteUrl}
              className="
                h-[36px] w-full rounded-[6px]
                border border-[0.5px] border-[var(--color-border)]
                bg-[var(--color-bg-surface-2)] px-3
                font-mono text-[12px] text-[var(--color-text-primary)]
                outline-none
              "
            />
          </div>

          <div className="mt-5 flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={handleCopy}>
              {copied ? 'Скопировано' : 'Скопировать ссылку'}
            </Button>
            <Button type="button" onClick={handleDone}>
              Готово
            </Button>
          </div>
        </>
      )}
    </Modal>
  );
}
