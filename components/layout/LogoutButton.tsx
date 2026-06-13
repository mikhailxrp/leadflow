'use client';

import { type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@iconify/react';
import IconButton from '@/components/ui/IconButton';

const HOME_PATH = '/';

export default function LogoutButton(): ReactNode {
  const router = useRouter();

  function handleLogout(): void {
    // TODO: signOut() через NextAuth, затем redirect
    router.push(HOME_PATH);
  }

  return (
    <IconButton
      onClick={handleLogout}
      aria-label="Выйти"
      title="Выйти"
      icon={<Icon icon="tabler:logout" className="h-5 w-5" aria-hidden="true" />}
    />
  );
}
