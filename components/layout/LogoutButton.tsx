'use client';

import { type ReactNode, useState } from 'react';
import { signOut } from 'next-auth/react';
import { Icon } from '@iconify/react';
import IconButton from '@/components/ui/IconButton';

const LOGIN_PATH = '/login';

export default function LogoutButton(): ReactNode {
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function handleLogout(): Promise<void> {
    setIsSigningOut(true);
    try {
      await signOut({ redirectTo: LOGIN_PATH });
    } catch (error) {
      console.error('Sign out failed:', error);
      setIsSigningOut(false);
    }
  }

  return (
    <IconButton
      onClick={handleLogout}
      disabled={isSigningOut}
      aria-label="Выйти"
      title="Выйти"
      icon={<Icon icon="tabler:logout" className="h-5 w-5" aria-hidden="true" />}
    />
  );
}
