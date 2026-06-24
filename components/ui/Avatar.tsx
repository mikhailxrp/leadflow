interface AvatarProps {
  initials: string;
  size?: 'sm' | 'md' | 'lg';
  src?: string;
  alt?: string;
  className?: string;
}

const sizeClasses = {
  sm: 'w-6 h-6 text-[10px]',
  md: 'w-8 h-8 text-[12px]',
  lg: 'w-10 h-10 text-[14px]',
};

export default function Avatar({ initials, size = 'md', src, alt, className = '' }: AvatarProps) {
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt || initials}
        className={`rounded-full object-cover flex-shrink-0 ${sizeClasses[size]} ${className}`}
      />
    );
  }

  return (
    <div
      className={`
        rounded-full flex items-center justify-center flex-shrink-0
        bg-[var(--color-bg-surface-2)]
        border border-[var(--color-border)] border-[0.5px]
        text-[var(--color-text-secondary)] font-medium
        ${sizeClasses[size]}
        ${className}
      `}
    >
      {initials}
    </div>
  );
}
