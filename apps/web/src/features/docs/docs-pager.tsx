'use client';

import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getDocsPager } from './nav';

export function DocsPager({ pathname }: { pathname: string }) {
  const { prev, next } = getDocsPager(pathname);

  if (!prev && !next) return null;

  return (
    <nav className="mt-12 flex items-stretch gap-3 border-t border-[#e6e6e6] pt-8">
      {prev ? (
        <Link
          href={prev.href}
          className="group flex min-w-0 flex-1 flex-col gap-1 rounded-lg border border-[#e6e6e6] bg-white px-4 py-3 transition hover:border-[#3ecf8e]/50"
        >
          <span className="flex items-center gap-1 text-xs text-[#8c8c8c]">
            <ChevronLeft size={12} /> Previous
          </span>
          <span className="truncate text-sm font-medium text-[#1c1c1c] group-hover:text-[#1c1c1c]">
            {prev.title}
          </span>
        </Link>
      ) : (
        <div className="flex-1" />
      )}
      {next ? (
        <Link
          href={next.href}
          className="group flex min-w-0 flex-1 flex-col items-end gap-1 rounded-lg border border-[#e6e6e6] bg-white px-4 py-3 text-right transition hover:border-[#3ecf8e]/50"
        >
          <span className="flex items-center gap-1 text-xs text-[#8c8c8c]">
            Next <ChevronRight size={12} />
          </span>
          <span className="truncate text-sm font-medium text-[#1c1c1c]">
            {next.title}
          </span>
        </Link>
      ) : null}
    </nav>
  );
}
