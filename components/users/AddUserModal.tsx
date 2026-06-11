'use client';

import { useState, type ReactNode } from 'react';
import { Icon } from '@iconify/react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import StatusRadioGroup, { ModalHeader, type UserStatus } from '@/components/users/userModalShared';

export interface AddUserModalProps {
  onConfirm: (data: {
    name: string;
    email: string;
    password: string;
    status: UserStatus;
  }) => void;
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

export default function AddUserModal({ onConfirm, onClose }: AddUserModalProps): ReactNode {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<UserStatus>('active');
  const [showPassword, setShowPassword] = useState(false);

  const isValid = name.trim().length > 0 && email.trim().length > 0;

  function handleConfirm(): void {
    if (!isValid) return;

    const data = {
      name: name.trim(),
      email: email.trim(),
      password,
      status,
    };

    // TODO: создание пользователя через API
    console.log('Add user', data);
    onConfirm(data);
  }

  return (
    <Modal onClose={onClose} dialogClassName="max-w-[420px]">
      <ModalHeader title="Новый менеджер" onClose={onClose} />

      <div className="mt-5 flex flex-col gap-4">
        <Input
          label="Имя"
          placeholder="Введите имя"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
        />

        <Input
          label="Email"
          type="email"
          placeholder="name@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
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
              className={`${inputBaseClass} pr-9`}
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
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-[12px] font-normal leading-5 text-[var(--color-text-secondary)]">
            Статус
          </span>
          <StatusRadioGroup value={status} onChange={setStatus} name="add-user-status" />
        </div>

        <div className="mt-2 flex justify-end gap-3">
          <Button variant="secondary" size="md" type="button" onClick={onClose}>
            Отмена
          </Button>
          <Button variant="primary" size="md" type="button" disabled={!isValid} onClick={handleConfirm}>
            Создать
          </Button>
        </div>
      </div>
    </Modal>
  );
}
