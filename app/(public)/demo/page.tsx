'use client';

import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Card from '@/components/ui/Card';

const DEMO_REDIRECT = '/today';

export default function DemoEntryPage() {
  const router = useRouter();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function enter(): Promise<void> {
      const result = await signIn('demo-access', {
        redirect: false,
        redirectTo: DEMO_REDIRECT,
      });

      if (cancelled) return;

      if (result?.error) {
        setFailed(true);
        return;
      }

      router.push(DEMO_REDIRECT);
    }

    enter().catch(() => {
      if (!cancelled) setFailed(true);
    });

    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-8">
      <div className="w-full max-w-[400px]">
        <Card padding="none" className="p-8 text-center">
          <div className="mb-6 flex items-center justify-center gap-2">
            <span
              className="h-2 w-2 shrink-0 rounded-full bg-[var(--color-primary)]"
              aria-hidden="true"
            />
            <span className="text-[14px] font-medium text-[var(--color-text-primary)]">
              Лид-Канал
            </span>
          </div>

          <p className="text-[14px] text-[var(--color-text-secondary)]">
            {failed
              ? 'Демо-доступ временно недоступен, попробуйте позже'
              : 'Заходим в демо…'}
          </p>
        </Card>
      </div>
    </main>
  );
}
