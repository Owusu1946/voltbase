'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

export type TocItem = { id: string; title: string };

export function DocsToc({ items }: { items: TocItem[] }) {
  const [active, setActive] = useState<string | null>(items[0]?.id ?? null);

  useEffect(() => {
    if (items.length === 0) return;
    const observers: IntersectionObserver[] = [];

    for (const item of items) {
      const el = document.getElementById(item.id);
      if (!el) continue;
      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry?.isIntersecting) setActive(item.id);
        },
        { rootMargin: '-20% 0px -65% 0px', threshold: 0 },
      );
      obs.observe(el);
      observers.push(obs);
    }

    return () => observers.forEach((o) => o.disconnect());
  }, [items]);

  if (items.length === 0) return null;

  return (
    <nav className="hidden w-48 shrink-0 xl:block" aria-label="On this page">
      <div className="sticky top-20">
        <p className="mb-3 text-xs font-semibold tracking-wide text-[#8c8c8c] uppercase">
          On this page
        </p>
        <ul className="space-y-1 border-l border-[#e6e6e6]">
          {items.map((item) => (
            <li key={item.id}>
              <a
                href={`#${item.id}`}
                className={cn(
                  '-ml-px block border-l pl-3 text-sm transition',
                  active === item.id
                    ? 'border-[#3ecf8e] font-medium text-[#1c1c1c]'
                    : 'border-transparent text-[#5c5c5c] hover:text-[#1c1c1c]',
                )}
              >
                {item.title}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
