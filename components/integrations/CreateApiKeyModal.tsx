'use client';

import { Icon } from '@iconify/react';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent, type ReactNode } from 'react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import { createApiKeySchema } from '@/lib/validations/apiKeys';

export interface CreatedApiKey {
  id: string;
  name: string;
  sourceLabel: string;
  mask: string;
  isEnabled: boolean;
  createdAt: string;
}

interface CreateApiKeyModalProps {
  onClose: () => void;
  onCreated: (key: CreatedApiKey) => void;
}

type FieldErrors = {
  name?: string;
  sourceLabel?: string;
};

type Step = 'form' | 'success';

export default function CreateApiKeyModal({
  onClose,
  onCreated,
}: CreateApiKeyModalProps): ReactNode {
  const router = useRouter();
  const [step, setStep] = useState<Step>('form');
  const [name, setName] = useState('');
  const [sourceLabel, setSourceLabel] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [plaintext, setPlaintext] = useState('');
  const [copied, setCopied] = useState(false);

  function resetState(): void {
    setStep('form');
    setName('');
    setSourceLabel('');
    setFieldErrors({});
    setServerError(null);
    setIsSubmitting(false);
    setPlaintext('');
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

    const parsed = createApiKeySchema.safeParse({
      name: name.trim(),
      sourceLabel: sourceLabel.trim(),
    });

    if (!parsed.success) {
      const nextFieldErrors: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0];
        if (field === 'name' || field === 'sourceLabel') {
          nextFieldErrors[field] = issue.message;
        }
      }
      setFieldErrors(nextFieldErrors);
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed.data),
      });

      const data: {
        id?: string;
        name?: string;
        sourceLabel?: string;
        mask?: string;
        isEnabled?: boolean;
        createdAt?: string;
        plaintext?: string;
        error?: string;
      } = await response.json();

      if (!response.ok || !data.id || !data.mask || !data.plaintext || !data.createdAt) {
        setServerError(data.error ?? 'Не удалось создать ключ');
        return;
      }

      setPlaintext(data.plaintext);
      setStep('success');
      onCreated({
        id: data.id,
        name: parsed.data.name,
        sourceLabel: parsed.data.sourceLabel,
        mask: data.mask,
        isEnabled: data.isEnabled ?? true,
        createdAt: data.createdAt,
      });
      router.refresh();
    } catch (error) {
      console.error(error);
      setServerError('Не удалось создать ключ');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCopy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(plaintext);
      setCopied(true);
    } catch (error) {
      console.error('Failed to copy API key:', error);
    }
  }

  return (
    <Modal onClose={handleClose} dialogClassName="max-w-[480px] rounded-[12px]">
      {step === 'form' ? (
        <>
          <h2 className="text-[16px] font-medium text-[var(--color-text-primary)]">
            Создать API-ключ
          </h2>
          <p className="mt-1 text-[13px] text-[var(--color-text-secondary)]">
            Ключ понадобится для подключения любого сайта или формы
          </p>

          <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-4">
            <Input
              label="Название"
              placeholder="Например: Форма на главной"
              value={name}
              onChange={(event) => setName(event.target.value)}
              error={fieldErrors.name}
              autoFocus
            />

            <Input
              label="Источник"
              placeholder="Например: landing"
              value={sourceLabel}
              onChange={(event) => setSourceLabel(event.target.value)}
              error={fieldErrors.sourceLabel}
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
            Ключ создан
          </h2>
          <p className="mt-1 text-[13px] text-[var(--color-text-secondary)]">
            Скопируйте ключ сейчас — он больше не будет показан
          </p>

          <div className="mt-5 flex flex-col gap-2">
            <label
              htmlFor="api-key-plaintext"
              className="text-[12px] text-[var(--color-text-secondary)]"
            >
              API-ключ
            </label>
            <input
              id="api-key-plaintext"
              type="text"
              readOnly
              value={plaintext}
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
            <Button
              type="button"
              variant="secondary"
              icon={copied ? undefined : <Icon icon="lucide:copy" className="h-4 w-4" />}
              onClick={handleCopy}
            >
              {copied ? 'Скопировано ✓' : 'Скопировать'}
            </Button>
            <Button type="button" onClick={handleClose}>
              Готово
            </Button>
          </div>
        </>
      )}
    </Modal>
  );
}
