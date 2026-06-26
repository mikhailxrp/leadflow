'use client';

import { Icon } from '@iconify/react';
import IconButton from '@/components/ui/IconButton';
import { useTheme } from '@/components/providers/ThemeProvider';

interface ThemeToggleProps {
  className?: string;
}

export default function ThemeToggle({ className }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <IconButton
      size="sm"
      onClick={toggleTheme}
      aria-label={isDark ? 'Переключить на светлую тему' : 'Переключить на тёмную тему'}
      className={className}
      icon={
        <Icon
          icon={isDark ? 'lucide:sun' : 'lucide:moon'}
          className="h-4 w-4"
          aria-hidden="true"
        />
      }
    />
  );
}
