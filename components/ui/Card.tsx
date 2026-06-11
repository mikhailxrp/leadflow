import { type ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  padding?: 'sm' | 'md' | 'lg' | 'none';
  onClick?: () => void;
  hover?: boolean;
}

const paddingClasses = {
  none: '',
  sm:   'p-3',
  md:   'p-[10px_12px]',
  lg:   'p-5',
};

export default function Card({
  children,
  className = '',
  padding = 'md',
  onClick,
  hover = false,
}: CardProps) {
  return (
    <div
      onClick={onClick}
      className={`
        bg-[var(--color-bg-surface)]
        border border-[var(--color-border)] border-[0.5px]
        rounded-[12px]
        ${paddingClasses[padding]}
        ${hover ? 'transition-colors duration-150 hover:border-[#10B981] cursor-pointer' : ''}
        ${onClick ? 'cursor-pointer' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  );
}
