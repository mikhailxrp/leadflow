'use client';

import { signIn } from 'next-auth/react';
import { useState, type ReactNode } from 'react';
import Button from '@/components/ui/Button';

interface MarketerAccessButtonProps {
  companyId: string;
}

export default function MarketerAccessButton({
  companyId,
}: MarketerAccessButtonProps): ReactNode {
  const [isLoading, setIsLoading] = useState(false);

  async function handleClick(): Promise<void> {
    setIsLoading(true);

    try {
      const response = await fetch(
        `/api/platform/companies/${companyId}/marketer-access`,
        { method: 'POST' },
      );

      if (!response.ok) {
        throw new Error('Failed to create marketer access token');
      }

      const data = (await response.json()) as { token: string };

      await signIn('marketer-access', {
        token: data.token,
        redirectTo: '/leads',
      });
    } catch (error) {
      console.error('Marketer access failed:', error);
      setIsLoading(false);
    }
  }

  return (
    <Button
      variant="secondary"
      size="sm"
      disabled={isLoading}
      onClick={handleClick}
    >
      {isLoading ? 'Вход…' : 'Войти в компанию'}
    </Button>
  );
}
