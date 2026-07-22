'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { DocsNavTree } from './docs-sidebar';

function VoltLogo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="currentColor"
      aria-hidden
    >
      <path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z" />
    </svg>
  );
}

export function DocsHeader() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const docsActive = pathname.startsWith('/docs');

  return (
    <header className="sticky top-0 z-40 border-b border-[#e6e6e6] bg-[#fafafa]/90 backdrop-blur-sm">
      <div className="flex h-14 items-center justify-between gap-4 px-4 lg:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            className="inline-flex size-9 items-center justify-center rounded-md border border-[#e6e6e6] bg-white text-[#1c1c1c] lg:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Open docs navigation"
          >
            <Menu size={18} />
          </button>
          <Link href="/" className="flex items-center gap-2">
            <VoltLogo className="h-5 w-5 text-[#3ecf8e]" />
            <span className="text-base font-semibold tracking-tight text-[#1c1c1c]">
              voltbase
            </span>
          </Link>
          <nav className="ml-4 hidden items-center gap-5 text-sm text-[#5c5c5c] sm:flex">
            <Link
              href="/docs"
              className={cn(
                'transition hover:text-[#1c1c1c]',
                docsActive && 'font-medium text-[#1c1c1c]',
              )}
            >
              Docs
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="hidden text-sm text-[#5c5c5c] hover:text-[#1c1c1c] sm:inline"
          >
            Sign in
          </Link>
          <Link
            href="/dashboard"
            className="rounded-md bg-[#3ecf8e] px-3 py-1.5 text-sm font-medium text-[#1c1c1c] transition hover:bg-[#38bc81]"
          >
            Dashboard
          </Link>
        </div>
      </div>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-[300px] bg-[#fafafa] p-0">
          <SheetHeader className="border-b border-[#e6e6e6] px-4 py-3 text-left">
            <SheetTitle className="text-base">Documentation</SheetTitle>
          </SheetHeader>
          <div className="overflow-y-auto p-4">
            <DocsNavTree onNavigate={() => setMobileOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>
    </header>
  );
}
