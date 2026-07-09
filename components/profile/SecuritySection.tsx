"use client";

import { useState } from "react";
import { Icon } from "@iconify/react";
import Button from "@/components/ui/Button";
import PasswordStrength, {
  calculatePasswordStrength,
} from "@/components/profile/PasswordStrength";
import ProfileRow from "@/components/profile/ProfileRow";
import ProfileSectionCard from "@/components/profile/ProfileSectionCard";

const inputBaseClass = `
  h-[36px] w-full rounded-[6px] pl-3
  border-[0.5px] border-[var(--color-border)]
  bg-[var(--color-bg-surface)]
  text-[14px] text-[var(--color-text-primary)]
  placeholder:text-[var(--color-text-tertiary)]
  transition-all duration-150 outline-none
  focus:border-[#10B981] focus:ring-1 focus:ring-[#10B981]
`;

export default function SecuritySection() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const passwordStrength = calculatePasswordStrength(newPassword);
  const displayStrength = newPassword ? passwordStrength : 4;

  const canSubmit =
    currentPassword.length > 0 &&
    newPassword.length >= 8 &&
    newPassword === confirmPassword &&
    !isSaving;

  async function handleChangePassword(): Promise<void> {
    setError(null);
    setSuccess(false);

    if (newPassword !== confirmPassword) {
      setError("Пароли не совпадают");
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch("/api/users/me/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data: { error?: string } = await response.json();

      if (!response.ok) {
        setError(
          data.error === "INVALID_CURRENT_PASSWORD"
            ? "Текущий пароль указан неверно"
            : "Не удалось сменить пароль",
        );
        return;
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setSuccess(true);
    } catch (err) {
      console.error(err);
      setError("Не удалось сменить пароль");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <ProfileSectionCard icon="tabler:lock" title="Безопасность">
      <ProfileRow label="Текущий пароль">
        <div className="relative flex-1">
          <input
            type={showCurrentPassword ? "text" : "password"}
            placeholder="Введите текущий пароль"
            value={currentPassword}
            onChange={(e) => {
              setCurrentPassword(e.target.value);
              setError(null);
              setSuccess(false);
            }}
            className={`${inputBaseClass} pr-9`}
          />
          <button
            type="button"
            onClick={() => setShowCurrentPassword((prev) => !prev)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)] transition-colors duration-150 hover:text-[var(--color-text-secondary)]"
            aria-label={
              showCurrentPassword ? "Скрыть пароль" : "Показать пароль"
            }
          >
            <Icon icon="tabler:eye" className="h-4 w-4" />
          </button>
        </div>
      </ProfileRow>

      <ProfileRow label="Новый пароль">
        <div className="flex flex-1 flex-col">
          <input
            type="password"
            placeholder="Введите новый пароль"
            value={newPassword}
            onChange={(e) => {
              setNewPassword(e.target.value);
              setError(null);
              setSuccess(false);
            }}
            className={inputBaseClass}
          />
          <div className="mt-2">
            <PasswordStrength strength={displayStrength} />
          </div>
          <span className="mt-1 text-[11px] text-[var(--color-text-tertiary)]">
            Минимум 8 символов
          </span>
        </div>
      </ProfileRow>

      <ProfileRow label="Подтвердить пароль">
        <div className="flex-1">
          <input
            type="password"
            placeholder="Повторите пароль"
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              setError(null);
              setSuccess(false);
            }}
            className={inputBaseClass}
          />
        </div>
      </ProfileRow>

      <div className="flex items-center justify-between px-6 py-3">
        <div>
          {error && (
            <p className="text-[12px] text-[#DC2626]" role="alert">
              {error}
            </p>
          )}
          {success && !error && (
            <p className="text-[12px] text-[#059669]">Пароль изменён</p>
          )}
        </div>
        <Button
          variant="secondary"
          size="md"
          type="button"
          disabled={!canSubmit}
          onClick={handleChangePassword}
        >
          {isSaving ? "Сохранение…" : "Сменить пароль"}
        </Button>
      </div>
    </ProfileSectionCard>
  );
}
