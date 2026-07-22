import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

export function Callout({
  title,
  children,
  variant = 'info',
}: {
  title?: string;
  children: ReactNode;
  variant?: 'info' | 'warn' | 'tip';
}) {
  return (
    <div
      className={cn(
        'my-6 rounded-lg border px-4 py-3 text-sm leading-relaxed',
        variant === 'info' && 'border-[#3ecf8e]/35 bg-[#3ecf8e]/8 text-[#1c1c1c]',
        variant === 'warn' && 'border-amber-300 bg-amber-50 text-amber-950',
        variant === 'tip' && 'border-[#e6e6e6] bg-white text-[#5c5c5c]',
      )}
    >
      {title ? (
        <p className="mb-1 font-semibold text-[#1c1c1c]">{title}</p>
      ) : null}
      <div className="[&_a]:font-medium [&_a]:text-[#1c1c1c] [&_a]:underline [&_a]:underline-offset-2">
        {children}
      </div>
    </div>
  );
}

export function PageHeader({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <header className="mb-8 border-b border-[#e6e6e6] pb-6">
      <h1 className="text-3xl font-bold tracking-tight text-[#1c1c1c] sm:text-4xl">
        {title}
      </h1>
      {description ? (
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-[#5c5c5c]">
          {description}
        </p>
      ) : null}
    </header>
  );
}

export function DocsProse({ children }: { children: ReactNode }) {
  return (
    <div className="docs-prose max-w-[720px] text-[15px] leading-7 text-[#3c3c3c] [&_h2]:mt-10 [&_h2]:mb-3 [&_h2]:scroll-mt-24 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:tracking-tight [&_h2]:text-[#1c1c1c] [&_h3]:mt-8 [&_h3]:mb-2 [&_h3]:scroll-mt-24 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-[#1c1c1c] [&_p]:my-3 [&_ul]:my-3 [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5 [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:space-y-1.5 [&_ol]:pl-5 [&_li]:text-[#3c3c3c] [&_strong]:font-semibold [&_strong]:text-[#1c1c1c] [&_a]:font-medium [&_a]:text-[#1c1c1c] [&_a]:underline [&_a]:underline-offset-2 [&_:not(pre)_>_code]:rounded [&_:not(pre)_>_code]:bg-[#f0f0f0] [&_:not(pre)_>_code]:px-1 [&_:not(pre)_>_code]:py-0.5 [&_:not(pre)_>_code]:font-mono [&_:not(pre)_>_code]:text-[13px] [&_:not(pre)_>_code]:text-[#1c1c1c] [&_table]:my-4 [&_table]:w-full [&_table]:text-left [&_table]:text-sm [&_th]:border-b [&_th]:border-[#e6e6e6] [&_th]:py-2 [&_th]:pr-4 [&_th]:font-semibold [&_th]:text-[#1c1c1c] [&_td]:border-b [&_td]:border-[#f0f0f0] [&_td]:py-2 [&_td]:pr-4">
      {children}
    </div>
  );
}
