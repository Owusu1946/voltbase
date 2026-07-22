import Link from 'next/link';
import type { DocEntry } from '../registry';

const FRAMEWORKS = [
  {
    title: 'Next.js',
    href: '/docs/frameworks/nextjs',
    blurb: 'App Router Server Components + voltbase-js',
  },
  {
    title: 'React',
    href: '/docs/frameworks/react',
    blurb: 'Vite + React client queries',
  },
  {
    title: 'Vue',
    href: '/docs/frameworks/vue',
    blurb: 'Vite + Vue composition API',
  },
  {
    title: 'Nuxt',
    href: '/docs/frameworks/nuxt',
    blurb: 'Nuxt pages with runtime config',
  },
  {
    title: 'SvelteKit',
    href: '/docs/frameworks/sveltekit',
    blurb: 'Server load functions + Svelte 5',
  },
  {
    title: 'Astro',
    href: '/docs/frameworks/astro',
    blurb: 'Static/SSR pages with frontmatter fetches',
  },
  {
    title: 'Expo',
    href: '/docs/frameworks/expo',
    blurb: 'React Native with Expo public env',
  },
  {
    title: 'Hono',
    href: '/docs/frameworks/hono',
    blurb: 'Edge-friendly API routes',
  },
] as const;

export const FrameworksOverviewPage: DocEntry = {
  title: 'Framework Quickstarts',
  description:
    'Pick your stack and go from a Voltbase project to a working query in minutes.',
  toc: [{ id: 'guides', title: 'Guides' }],
  render: () => (
    <>
      <h2 id="guides">Guides</h2>
      <p>
        Each guide walks through creating a project, seeding a sample table,
        wiring env vars, and fetching data with <code>voltbase-js</code>.
      </p>
      <ul>
        {FRAMEWORKS.map((fw) => (
          <li key={fw.href}>
            <Link href={fw.href}>{fw.title}</Link> — {fw.blurb}
          </li>
        ))}
      </ul>
      <p>
        Ready to ship? Use dashboard{' '}
        <Link href="/docs/hosting">Hosting</Link> to import the repo and deploy
        to Cloudflare Pages with Voltbase env injected.
      </p>
      <p>
        Looking for a framework-agnostic path? Start with the{' '}
        <Link href="/docs/getting-started/quickstart">Quickstart</Link> or{' '}
        <Link href="/docs/javascript/install">JavaScript install</Link>.
      </p>
    </>
  ),
};
