'use client';

import { useEffect, useState, type ReactNode } from 'react';
import type { HelpHeading } from '@/lib/help/markdown';

interface HelpTocProps {
  headings: HelpHeading[];
}

export default function HelpToc({ headings }: HelpTocProps): ReactNode {
  const [activeId, setActiveId] = useState<string>(headings[0]?.id ?? '');

  useEffect(() => {
    if (headings.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]?.target.id) {
          setActiveId(visible[0].target.id);
        }
      },
      { rootMargin: '-80px 0px -70% 0px', threshold: 0 },
    );

    const nodes = headings
      .map((h) => document.getElementById(h.id))
      .filter((n): n is HTMLElement => n !== null);
    nodes.forEach((n) => observer.observe(n));

    return () => observer.disconnect();
  }, [headings]);

  function handleClick(event: React.MouseEvent, id: string): void {
    event.preventDefault();
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setActiveId(id);
    window.history.replaceState(null, '', `#${id}`);
  }

  if (headings.length === 0) return null;

  return (
    <nav aria-label="На этой странице" className="flex flex-col gap-1">
      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)]">
        На этой странице
      </p>
      {headings.map((h) => {
        const active = h.id === activeId;
        return (
          <a
            key={h.id}
            href={`#${h.id}`}
            onClick={(e) => handleClick(e, h.id)}
            className={`border-l-[2px] py-1 pl-3 text-[12.5px] leading-[1.4] transition-colors ${
              active
                ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
                : 'border-[var(--color-border)] text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]'
            }`}
          >
            {h.text}
          </a>
        );
      })}
    </nav>
  );
}
