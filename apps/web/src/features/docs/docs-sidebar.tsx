'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DOCS_NAV, type DocsNavGroup } from './nav';
import { DocsSearchBox } from './docs-search';

const STORAGE_KEY = 'voltbase.docs.nav';

function loadOpenState(groups: DocsNavGroup[]): Record<string, boolean> {
  const defaults: Record<string, boolean> = {};
  for (const g of groups) {
    defaults[g.id] = Boolean(g.defaultOpen);
  }
  if (typeof window === 'undefined') return defaults;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaults;
    return { ...defaults, ...(JSON.parse(raw) as Record<string, boolean>) };
  } catch {
    return defaults;
  }
}

export function DocsNavTree({
  onNavigate,
  className,
}: {
  onNavigate?: () => void;
  className?: string;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(DOCS_NAV.map((g) => [g.id, Boolean(g.defaultOpen)])),
  );
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setOpen(loadOpenState(DOCS_NAV));
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(open));
  }, [open, hydrated]);

  // Auto-open group containing active page
  useEffect(() => {
    const group = DOCS_NAV.find((g) =>
      g.items.some(
        (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
      ),
    );
    if (group && !open[group.id]) {
      setOpen((prev) => ({ ...prev, [group.id]: true }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only react to pathname
  }, [pathname]);

  const activeHref = useMemo(() => {
    for (const g of DOCS_NAV) {
      for (const item of g.items) {
        if (pathname === item.href) return item.href;
      }
    }
    return null;
  }, [pathname]);

  function toggle(id: string) {
    setOpen((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      <DocsSearchBox onNavigate={onNavigate} />

      <nav className="flex flex-col gap-1" aria-label="Documentation">
        {DOCS_NAV.map((group) => {
          const Icon = group.icon;
          const isOpen = open[group.id] ?? false;
          return (
            <div key={group.id} className="mb-1">
              <button
                type="button"
                onClick={() => toggle(group.id)}
                aria-expanded={isOpen}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs font-semibold tracking-wide text-[#5c5c5c] uppercase transition hover:bg-[#f0f0f0] hover:text-[#1c1c1c]"
              >
                <Icon size={14} className="shrink-0 text-[#8c8c8c]" />
                <span className="min-w-0 flex-1 truncate normal-case tracking-normal">
                  {group.title}
                </span>
                <ChevronDown
                  size={14}
                  className={cn(
                    'shrink-0 text-[#8c8c8c] transition-transform',
                    isOpen && 'rotate-180',
                  )}
                />
              </button>
              {isOpen ? (
                <ul className="mt-0.5 ml-2 space-y-0.5 border-l border-[#e6e6e6] pl-2">
                  {group.items.map((item) => {
                    const active = activeHref === item.href;
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          onClick={onNavigate}
                          className={cn(
                            'block rounded-md px-2.5 py-1.5 text-sm transition',
                            active
                              ? 'bg-[#eef8f2] font-medium text-[#1c1c1c]'
                              : 'text-[#5c5c5c] hover:bg-[#f5f5f5] hover:text-[#1c1c1c]',
                          )}
                        >
                          {item.title}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </div>
          );
        })}
      </nav>
    </div>
  );
}
