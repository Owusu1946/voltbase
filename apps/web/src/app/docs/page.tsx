import Link from 'next/link';
import { DOCS_NAV } from '@/features/docs/nav';

export const metadata = {
  title: 'Documentation | Voltbase',
  description:
    'Build with Voltbase — Postgres, auth, storage, realtime, and the JavaScript SDK.',
};

export default function DocsHomePage() {
  return (
    <div className="px-4 py-10 lg:px-10">
      <div className="max-w-3xl">
        <p className="text-sm font-medium text-[#3ecf8e]">Documentation</p>
        <h1 className="mt-2 text-4xl font-bold tracking-tight text-[#1c1c1c]">
          Build with Voltbase
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-[#5c5c5c]">
          Everything you need — from your first query to RLS-backed apps,
          realtime rooms, and storage galleries.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/docs/getting-started/quickstart"
            className="rounded-md bg-[#3ecf8e] px-4 py-2 text-sm font-medium text-[#1c1c1c] transition hover:bg-[#38bc81]"
          >
            Quickstart
          </Link>
          <Link
            href="/docs/frameworks/nextjs"
            className="rounded-md border border-[#d4d4d4] bg-white px-4 py-2 text-sm font-medium text-[#1c1c1c] transition hover:border-[#a3a3a3]"
          >
            Next.js guide
          </Link>
          <Link
            href="/docs/frameworks"
            className="rounded-md border border-[#d4d4d4] bg-white px-4 py-2 text-sm font-medium text-[#1c1c1c] transition hover:border-[#a3a3a3]"
          >
            All frameworks
          </Link>
        </div>
      </div>

      <div className="mt-14 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {DOCS_NAV.map((group) => {
          const Icon = group.icon;
          return (
            <div
              key={group.id}
              className="rounded-xl border border-[#e6e6e6] bg-white p-5"
            >
              <div className="mb-3 flex items-center gap-2">
                <div className="flex size-8 items-center justify-center rounded-lg bg-[#3ecf8e]/10 text-[#1c1c1c]">
                  <Icon size={16} />
                </div>
                <h2 className="text-sm font-semibold text-[#1c1c1c]">
                  {group.title}
                </h2>
              </div>
              <ul className="space-y-1.5">
                {group.items.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="text-sm text-[#5c5c5c] transition hover:text-[#1c1c1c]"
                    >
                      {item.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
