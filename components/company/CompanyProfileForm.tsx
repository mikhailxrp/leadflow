'use client';

import { useState } from 'react';
import { Icon } from '@iconify/react';
import CompanyLogoUploader from '@/components/company/CompanyLogoUploader';
import ProfileFooter from '@/components/profile/ProfileFooter';
import ProfileRow from '@/components/profile/ProfileRow';
import ProfileSectionCard from '@/components/profile/ProfileSectionCard';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { LEGAL_FORM_OPTIONS } from '@/constants/legalForms';
import type { CompanyProfileDetail } from '@/types/company';

const LEGAL_FORM_SELECT_OPTIONS = [
  { value: '', label: 'Не выбрано' },
  ...LEGAL_FORM_OPTIONS,
];

interface CompanyProfileFormProps {
  company: CompanyProfileDetail;
}

interface CompanyFormState {
  phone: string;
  email: string;
  address: string;
  legalForm: string;
  directorName: string;
}

function toFormState(company: CompanyProfileDetail): CompanyFormState {
  return {
    phone: company.phone ?? '',
    email: company.email ?? '',
    address: company.address ?? '',
    legalForm: company.legalForm ?? '',
    directorName: company.directorName ?? '',
  };
}

export default function CompanyProfileForm({ company: initialCompany }: CompanyProfileFormProps) {
  const [company, setCompany] = useState<CompanyProfileDetail>(initialCompany);
  const [form, setForm] = useState<CompanyFormState>(() => toFormState(initialCompany));
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isDirty = JSON.stringify(form) !== JSON.stringify(toFormState(company));

  function handleFieldChange<K extends keyof CompanyFormState>(
    key: K,
    value: CompanyFormState[K],
  ): void {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleCancel(): void {
    setForm(toFormState(company));
    setError(null);
  }

  async function handleSave(): Promise<void> {
    if (!form.phone.trim() || !form.email.trim()) {
      setError('Телефон и почта обязательны');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch('/api/company', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: form.phone.trim(),
          email: form.email.trim(),
          address: form.address.trim() || null,
          legalForm: form.legalForm || null,
          directorName: form.directorName.trim() || null,
        }),
      });

      const data: CompanyProfileDetail & { error?: string } = await response.json();

      if (!response.ok) {
        setError(data.error ?? 'Не удалось сохранить данные компании');
        return;
      }

      setCompany(data);
      setForm(toFormState(data));
    } catch (err) {
      console.error(err);
      setError('Не удалось сохранить данные компании');
    } finally {
      setIsSaving(false);
    }
  }

  function handleLogoChange(logoUrl: string | null): void {
    setCompany((prev) => ({ ...prev, logoUrl }));
  }

  return (
    <>
      <div className="flex flex-col gap-4">
        <ProfileSectionCard icon="tabler:building" title="Компания">
          <div className="px-6 py-4">
            <CompanyLogoUploader
              name={company.name}
              logoUrl={company.logoUrl}
              onLogoChange={handleLogoChange}
            />
          </div>
          <ProfileRow label="Название">
            <div className="flex flex-1 items-center gap-2 text-[14px] text-[var(--color-text-primary)]">
              {company.name}
              <Icon
                icon="tabler:lock"
                className="h-3.5 w-3.5 text-[var(--color-text-tertiary)]"
                aria-hidden="true"
              />
            </div>
          </ProfileRow>
        </ProfileSectionCard>

        <ProfileSectionCard icon="tabler:address-book" title="Контакты">
          <ProfileRow label="Телефон *">
            <div className="flex-1">
              <Input
                type="tel"
                value={form.phone}
                onChange={(e) => handleFieldChange('phone', e.target.value)}
                icon={<Icon icon="tabler:phone" className="h-4 w-4" />}
              />
            </div>
          </ProfileRow>
          <ProfileRow label="Почта *">
            <div className="flex-1">
              <Input
                type="email"
                value={form.email}
                onChange={(e) => handleFieldChange('email', e.target.value)}
                icon={<Icon icon="tabler:mail" className="h-4 w-4" />}
              />
            </div>
          </ProfileRow>
          <ProfileRow label="Адрес">
            <div className="flex-1">
              <Input
                value={form.address}
                onChange={(e) => handleFieldChange('address', e.target.value)}
                icon={<Icon icon="tabler:map-pin" className="h-4 w-4" />}
              />
            </div>
          </ProfileRow>
        </ProfileSectionCard>

        <ProfileSectionCard icon="tabler:file-text" title="Реквизиты">
          <ProfileRow label="Форма регистрации">
            <Select
              value={form.legalForm}
              onChange={(value) => handleFieldChange('legalForm', value)}
              options={LEGAL_FORM_SELECT_OPTIONS}
              className="max-w-[240px]"
            />
          </ProfileRow>
          <ProfileRow label="ФИО руководителя">
            <div className="flex-1">
              <Input
                value={form.directorName}
                onChange={(e) => handleFieldChange('directorName', e.target.value)}
                icon={<Icon icon="tabler:user" className="h-4 w-4" />}
              />
            </div>
          </ProfileRow>
        </ProfileSectionCard>
      </div>

      <ProfileFooter
        isDirty={isDirty}
        isSaving={isSaving}
        error={error}
        onCancel={handleCancel}
        onSave={handleSave}
      />
    </>
  );
}
