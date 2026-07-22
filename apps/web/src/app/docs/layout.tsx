import Link from 'next/link';
import { DocsHeader } from '@/features/docs/docs-header';
import { DocsNavTree } from '@/features/docs/docs-sidebar';

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-svh bg-[#fafafa] text-[#1c1c1c]">
      <DocsHeader />
      <div className="mx-auto flex w-full max-w-[1400px]">
        <aside className="sticky top-14 hidden h-[calc(100svh-3.5rem)] w-64 shrink-0 overflow-y-auto border-r border-[#e6e6e6] px-4 py-6 lg:block">
          <DocsNavTree />
        </aside>
        <div className="min-w-0 flex-1">
          {children}
          <footer className="border-t border-[#e6e6e6] px-4 py-10 lg:px-10">
            <div className="mx-auto flex max-w-[720px] flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-[#5c5c5c]">
                Ready to build? Create a free project in the dashboard.
              </p>
              <Link
                href="/register"
                className="rounded-md bg-[#3ecf8e] px-4 py-2 text-sm font-medium text-[#1c1c1c] transition hover:bg-[#38bc81]"
              >
                Start your project
              </Link>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}
