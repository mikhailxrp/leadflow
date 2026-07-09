import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Контроль',
};

export default function ControlPage() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-8">
      <p className="text-[14px] text-[var(--color-text-secondary)]">
        Раздел в разработке
      </p>
    </main>
  );
}
