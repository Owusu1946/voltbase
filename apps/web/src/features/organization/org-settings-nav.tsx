'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

export function OrgSettingsNav({ slug }: { slug: string }) {
  const pathname = usePathname();
  const tabs = [
    {
      href: `/organizations/${slug}/settings`,
      label: 'General',
      active: pathname === `/organizations/${slug}/settings`,
    },
    {
      href: `/organizations/${slug}/settings/members`,
      label: 'Members',
      active: pathname.startsWith(`/organizations/${slug}/settings/members`),
    },
  ];

  return (
    <nav className="mb-8 flex gap-4 border-b border-border">
      {tabs.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          className={cn(
            'border-b-2 px-1 pb-3 text-sm transition-colors',
            tab.active
              ? 'border-foreground text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground',
          )}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
