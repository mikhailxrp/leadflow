'use client';

import { signIn } from 'next-auth/react';
import { useState, type ReactNode } from 'react';
import Button from '@/components/ui/Button';

const PLATFORM_COMPANIES_PATH = '/platform/companies';

interface MarketerBannerProps {
  companyName: string;
}

export default function MarketerBanner({
  companyName,
}: MarketerBannerProps): ReactNode {
  const [isEnding, setIsEnding] = useState(false);

  async function handleEnd(): Promise<void> {
    setIsEnding(true);

    try {
      const response = await fetch('/api/platform/marketer-access/end', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to end marketer access');
      }

      const data = (await response.json()) as { token: string };

      await signIn('platform-restore', {
        token: data.token,
        redirectTo: PLATFORM_COMPANIES_PATH,
      });
    } catch (error) {
      console.error('Failed to end marketer access:', error);
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
        Вы вошли как маркетолог — {companyName}
      </p>
      <Button
        variant="danger"
        size="sm"
        disabled={isEnding}
        onClick={handleEnd}
      >
        {isEnding ? 'Выход…' : 'Выйти'}
      </Button>
    </div>
  );
}
