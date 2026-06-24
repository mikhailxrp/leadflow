'use client';

import { signIn } from 'next-auth/react';
import { useState, type ReactNode } from 'react';
import Button from '@/components/ui/Button';

const PLATFORM_COMPANIES_PATH = '/platform/companies';

export default function ImpersonationBanner(): ReactNode {
  const [isEnding, setIsEnding] = useState(false);

  async function handleEnd(): Promise<void> {
    setIsEnding(true);

    try {
      const response = await fetch('/api/platform/impersonate/end', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to end impersonation');
      }

      const data = (await response.json()) as { token: string };

      await signIn('platform-restore', {
        token: data.token,
        redirectTo: PLATFORM_COMPANIES_PATH,
      });
    } catch (error) {
      console.error('Failed to end impersonation:', error);
      setIsEnding(false);
    }
  }

  return (
    <div
      className="
        flex shrink-0 items-center justify-between gap-4
        border-b border-[0.5px] border-[#FECACA]
        bg-[#FEF2F2] px-6 py-2.5
      "
      role="status"
    >
      <p className="text-[13px] font-medium text-[#DC2626]">
        Вы вошли от имени поддержки LeadFlow
      </p>
      <Button
        variant="danger"
        size="sm"
        disabled={isEnding}
        onClick={handleEnd}
      >
        {isEnding ? 'Выход…' : 'Выйти из режима'}
      </Button>
    </div>
  );
}
