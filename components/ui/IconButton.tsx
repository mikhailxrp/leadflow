import { type ButtonHTMLAttributes, type ReactNode } from 'react';

type IconButtonSize = 'sm' | 'md';

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ReactNode;
  size?: IconButtonSize;
}

const sizeClasses: Record<IconButtonSize, string> = {
  sm: 'p-1',
  md: 'h-9 w-9',
};

export default function IconButton({
  icon,
  size = 'md',
  className = '',
  type = 'button',
  ...props
}: IconButtonProps): ReactNode {
  return (
    <button
      type={type}
      className={`
        inline-flex shrink-0 cursor-pointer items-center justify-center rounded-[6px]
        text-[var(--color-text-secondary)]
        transition-colors duration-150
        hover:bg-[var(--color-bg-surface-2)] hover:text-[var(--color-text-primary)]
        disabled:cursor-not-allowed disabled:opacity-50
        ${sizeClasses[size]}
        ${className}
      `}
      {...props}
    >
      {icon}
    </button>
  );
}
