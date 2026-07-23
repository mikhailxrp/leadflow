'use client';

import { signIn } from 'next-auth/react';
import { useState, type ReactNode } from 'react';
import Button from '@/components/ui/Button';

interface ImpersonateButtonProps {
  companyId: string;
  userId: string;
  className?: string;
}

export default function ImpersonateButton({
  companyId,
  userId,
  className,
}: ImpersonateButtonProps): ReactNode {
  const [isLoading, setIsLoading] = useState(false);

  async function handleClick(): Promise<void> {
    setIsLoading(true);

    try {
      const response = await fetch(
        `/api/platform/companies/${companyId}/impersonate/${userId}`,
        { method: 'POST' },
      );

      if (!response.ok) {
        throw new Error('Failed to create impersonation token');
      }

      const data = (await response.json()) as { token: string };

      await signIn('impersonation', {
        token: data.token,
        redirectTo: '/today',
      });
    } catch (error) {
      console.error('Impersonation failed:', error);
      setIsLoading(false);
    }
  }

  return (
    <Button
      variant="secondary"
      size="sm"
      disabled={isLoading}
      onClick={handleClick}
      className={className}
    >
      {isLoading ? 'Вход…' : 'Войти как поддержка'}
    </Button>
  );
}
