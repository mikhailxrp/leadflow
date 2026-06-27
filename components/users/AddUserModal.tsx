'use client';

import { useState, type ReactNode } from 'react';
import { Icon } from '@iconify/react';
import type { UserRole as PrismaUserRole } from '@prisma/client';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { RoleRadioGroup, ModalHeader } from '@/components/users/userModalShared';
import { createUserSchema } from '@/lib/validations/users';

export interface AddUserModalProps {
  onSuccess: () => void;
  onClose: () => void;
}

const inputBaseClass = `
  h-[36px] w-full rounded-[6px]
  border-[0.5px] border-[var(--color-border)]
  bg-[var(--color-bg-surface)]
  px-3 text-[14px] text-[var(--color-text-primary)]
  placeholder:text-[var(--color-text-tertiary)]
  transition-all duration-150 outline-none
  focus:border-[#10B981] focus:ring-1 focus:ring-[#10B981]
`;

const fieldErrorMessages: Record<string, string> = {
  name: 'Обязательное поле',
  email: 'Некорректный email',
  password: 'Минимум 8 символов',
  role: 'Выберите роль',
};

export default function AddUserModal({ onSuccess, onClose }: AddUserModalProps): ReactNode {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<PrismaUserRole>('MANAGER');
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(): Promise<void> {
    setFieldErrors({});
    setFormError(null);

    const parsed = createUserSchema.safeParse({ name, email, password, role });
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const field = String(issue.path[0]);
        if (!errs[field]) {
          errs[field] = fieldErrorMessages[field] ?? 'Некорректное значение';
        }
      }
      setFieldErrors(errs);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed.data),
      });

      if (res.ok) {
        onSuccess();
        return;
      }

      const json = (await res.json()) as { error?: string };
      if (json.error === 'EMAIL_EXISTS') {
        setFieldErrors({ email: 'Пользователь с таким email уже существует' });
      } else if (json.error === 'VALIDATION_ERROR') {
        setFormError('Некорректные данные. Проверьте форму.');
      } else {
        setFormError('Произошла ошибка. Попробуйте ещё раз.');
      }
    } catch {
      setFormError('Произошла ошибка. Попробуйте ещё раз.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal onClose={onClose} dialogClassName="max-w-[420px]">
      <ModalHeader title="Новый пользователь" onClose={onClose} />

      <div className="mt-5 flex flex-col gap-4">
        <Input
          label="Имя"
          placeholder="Введите имя"
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={fieldErrors.name}
          autoFocus
        />

        <Input
          label="Email"
          type="email"
          placeholder="name@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={fieldErrors.email}
        />

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="add-user-password"
            className="text-[12px] font-normal leading-5 text-[var(--color-text-secondary)]"
          >
            Пароль
          </label>
          <div className="relative">
            <input
              id="add-user-password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Введите пароль"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`${inputBaseClass} pr-9 ${fieldErrors.password ? 'border-[#EF4444] focus:border-[#EF4444] focus:ring-[#EF4444]' : ''}`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)] transition-colors duration-150 hover:text-[var(--color-text-secondary)]"
              aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
            >
              <Icon icon="tabler:eye" className="h-4 w-4" />
            </button>
          </div>
          {fieldErrors.password && (
            <span className="text-[12px] text-[#EF4444]">{fieldErrors.password}</span>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-[12px] font-normal leading-5 text-[var(--color-text-secondary)]">
            Роль
          </span>
          <RoleRadioGroup value={role} onChange={setRole} name="add-user-role" />
        </div>

        {formError && (
          <p className="text-[13px] text-[#EF4444]">{formError}</p>
        )}

        <div className="mt-2 flex justify-end gap-3">
          <Button variant="secondary" size="md" type="button" onClick={onClose} disabled={loading}>
            Отмена
          </Button>
          <Button
            variant="primary"
            size="md"
            type="button"
            disabled={loading}
            onClick={handleSubmit}
          >
            {loading ? 'Создание...' : 'Создать'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
