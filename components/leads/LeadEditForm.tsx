'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Card from '@/components/ui/Card';
import Toast from '@/components/ui/Toast';
import { updateLeadSchema } from '@/lib/validations/leads';

interface LeadEditFormProps {
  leadId: string;
  initialName: string | null;
  initialPhone: string | null;
  initialEmail: string | null;
  initialComment: string | null;
}

export default function LeadEditForm({
  leadId,
  initialName,
  initialPhone,
  initialEmail,
  initialComment,
}: LeadEditFormProps) {
  const router = useRouter();
  const [name, setName] = useState(initialName ?? '');
  const [phone, setPhone] = useState(initialPhone ?? '');
  const [email, setEmail] = useState(initialEmail ?? '');
  const [comment, setComment] = useState(initialComment ?? '');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});
  const [toast, setToast] = useState<'success' | 'error' | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});

    const raw = {
      name: name.trim() || undefined,
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
      comment: comment.trim() || undefined,
    };

    const parsed = updateLeadSchema.safeParse(raw);
    if (!parsed.success) {
      const fieldErrors: Partial<Record<string, string>> = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0];
        if (typeof field === 'string') {
          fieldErrors[field] = issue.message;
        }
      }
      setErrors(fieldErrors);
      return;
    }

    if (Object.keys(parsed.data).length === 0) {
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed.data),
      });

      if (!res.ok) {
        setToast('error');
        return;
      }

      setToast('success');
      router.refresh();
    } catch {
      setToast('error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Card padding="lg">
        <h2 className="mb-5 text-[14px] font-medium text-[var(--color-text-primary)]">
          Редактировать контакт
        </h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            label="Имя"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Введите имя"
            error={errors.name}
          />
          <Input
            label="Телефон"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+7 (999) 000-00-00"
            error={errors.phone}
          />
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email@example.com"
            error={errors.email}
          />

          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-normal leading-5 text-[var(--color-text-secondary)]">
              Комментарий
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Заметка о клиенте..."
              rows={3}
              className="
                w-full resize-none rounded-[6px]
                border border-[0.5px] border-[var(--color-border)]
                bg-[var(--color-bg-surface)]
                px-3 py-2.5 text-[14px] text-[var(--color-text-primary)]
                placeholder:text-[var(--color-text-tertiary)]
                outline-none transition-all duration-150
                focus:border-[#10B981] focus:ring-1 focus:ring-[#10B981]
              "
            />
          </div>

          <Button type="submit" variant="secondary" size="md" disabled={loading}>
            {loading ? 'Сохранение...' : 'Сохранить изменения'}
          </Button>
        </form>
      </Card>

      {toast === 'success' && (
        <Toast
          title="Данные сохранены"
          onClose={() => setToast(null)}
        />
      )}
      {toast === 'error' && (
        <Toast
          title="Ошибка сохранения"
          message="Не удалось сохранить изменения"
          onClose={() => setToast(null)}
        />
      )}
    </>
  );
}
