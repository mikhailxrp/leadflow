'use client';

import { signOut } from 'next-auth/react';
import { useState } from 'react';

const PLATFORM_LOGIN_PATH = '/platform/login';

export default function PlatformSignOutButton() {
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function handleSignOut(): Promise<void> {
    setIsSigningOut(true);
    try {
      await signOut({ redirectTo: PLATFORM_LOGIN_PATH });
    } catch (error) {
      console.error('Platform sign out failed:', error);
      setIsSigningOut(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      disabled={isSigningOut}
      className="
        flex w-full items-center gap-3 rounded-[6px] px-3 py-[7px]
        text-[13px] font-medium text-[#94A3B8]
        transition-colors duration-150
        hover:bg-[rgba(255,255,255,0.06)]
        disabled:cursor-not-allowed disabled:opacity-50
      "
    >
      {isSigningOut ? 'Выход…' : 'Выйти'}
    </button>
  );
}
