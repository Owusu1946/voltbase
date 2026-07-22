import type { LucideIcon } from 'lucide-react';
import {
  BookOpen,
  Rocket,
  Code2,
  Network,
  Shield,
  Database,
  LayoutDashboard,
  Blocks,
  BookMarked,
  Layers,
} from 'lucide-react';

export type DocsNavItem = {
  title: string;
  href: string;
};

export type DocsNavGroup = {
  id: string;
  title: string;
  icon: LucideIcon;
  defaultOpen?: boolean;
  items: DocsNavItem[];
};

export const DOCS_NAV: DocsNavGroup[] = [
  {
    id: 'getting-started',
    title: 'Getting started',
    icon: Rocket,
    defaultOpen: true,
    items: [
      { title: 'Introduction', href: '/docs/getting-started/introduction' },
      { title: 'Quickstart', href: '/docs/getting-started/quickstart' },
    ],
  },
  {
    id: 'frameworks',
    title: 'Framework Quickstarts',
    icon: Layers,
    defaultOpen: true,
    items: [
      { title: 'Overview', href: '/docs/frameworks' },
      { title: 'Next.js', href: '/docs/frameworks/nextjs' },
      { title: 'React', href: '/docs/frameworks/react' },
      { title: 'Vue', href: '/docs/frameworks/vue' },
      { title: 'Nuxt', href: '/docs/frameworks/nuxt' },
      { title: 'SvelteKit', href: '/docs/frameworks/sveltekit' },
      { title: 'Astro', href: '/docs/frameworks/astro' },
      { title: 'Expo', href: '/docs/frameworks/expo' },
      { title: 'Hono', href: '/docs/frameworks/hono' },
    ],
  },
  {
    id: 'javascript',
    title: 'JavaScript',
    icon: Code2,
    items: [
      { title: 'Install', href: '/docs/javascript/install' },
      { title: 'Database', href: '/docs/javascript/database' },
      { title: 'Auth', href: '/docs/javascript/auth' },
      { title: 'Storage', href: '/docs/javascript/storage' },
      { title: 'Realtime', href: '/docs/javascript/realtime' },
    ],
  },
  {
    id: 'rest',
    title: 'REST API',
    icon: Network,
    items: [
      { title: 'Overview', href: '/docs/rest/overview' },
      { title: 'CRUD & filters', href: '/docs/rest/crud' },
      { title: 'Nested select & RPC', href: '/docs/rest/nested-rpc' },
      { title: 'Errors', href: '/docs/rest/errors' },
    ],
  },
  {
    id: 'security',
    title: 'Database & security',
    icon: Shield,
    items: [
      {
        title: 'Tables & migrations',
        href: '/docs/database/tables-migrations',
      },
      { title: 'Row Level Security', href: '/docs/database/rls' },
      { title: 'Keys & roles', href: '/docs/database/keys' },
      { title: 'Vectors (pgvector)', href: '/docs/database/vectors' },
      { title: 'Hosting', href: '/docs/hosting' },
    ],
  },
  {
    id: 'dashboard',
    title: 'Dashboard',
    icon: LayoutDashboard,
    items: [{ title: 'Product tour', href: '/docs/dashboard/tour' }],
  },
  {
    id: 'examples',
    title: 'Examples',
    icon: Blocks,
    items: [
      { title: 'Todo + RLS', href: '/docs/examples/todo-rls' },
      { title: 'Live chat', href: '/docs/examples/live-chat' },
      { title: 'Avatar gallery', href: '/docs/examples/avatar-gallery' },
      { title: 'Semantic search', href: '/docs/examples/semantic-search' },
    ],
  },
  {
    id: 'reference',
    title: 'Reference',
    icon: BookMarked,
    items: [
      { title: 'Client cheat sheet', href: '/docs/reference/cheat-sheet' },
      { title: 'Limitations', href: '/docs/reference/limitations' },
    ],
  },
];

export const DOCS_HOME = {
  title: 'Documentation',
  description:
    'Everything you need to build with Voltbase — database, auth, storage, realtime, and the JavaScript SDK.',
  icon: BookOpen,
};

/** Flat ordered list for prev/next paging */
export function flattenDocsNav(): DocsNavItem[] {
  return DOCS_NAV.flatMap((g) => g.items);
}

export function getDocsPager(pathname: string): {
  prev: DocsNavItem | null;
  next: DocsNavItem | null;
} {
  const flat = flattenDocsNav();
  const index = flat.findIndex((item) => item.href === pathname);
  if (index === -1) return { prev: null, next: null };
  return {
    prev: index > 0 ? flat[index - 1]! : null,
    next: index < flat.length - 1 ? flat[index + 1]! : null,
  };
}

export function findDocsNavItem(pathname: string): DocsNavItem | null {
  return flattenDocsNav().find((item) => item.href === pathname) ?? null;
}

/** Database icon export for home cards */
export { Database, BookOpen };
