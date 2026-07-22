import Link from 'next/link';
import type { DocEntry } from '../registry';
import { CodeBlock } from '../code-block';
import { Callout } from '../docs-ui';

export const HostingPage: DocEntry = {
  title: 'Hosting',
  description:
    'Import a GitHub repo and deploy to Cloudflare Pages from the Voltbase dashboard — DB + ship in one product.',
  toc: [
    { id: 'overview', title: 'Overview' },
    { id: 'setup', title: 'Platform setup' },
    { id: 'deploy', title: 'Deploy a site' },
    { id: 'env', title: 'Environment variables' },
    { id: 'frameworks', title: 'Frameworks' },
    { id: 'dns', title: 'Custom domain / DNS' },
    { id: 'limits', title: 'Limits' },
  ],
  render: () => (
    <>
      <Callout variant="info" title="Vercel-style deploys on Cloudflare">
        Hosting builds your frontend and publishes it to Cloudflare&apos;s edge.
        Your Voltbase project URL and anon key are injected automatically.
      </Callout>

      <h2 id="overview">Overview</h2>
      <p>
        Open a project → <strong>Hosting</strong> → connect GitHub → import a
        repository → Deploy. Status streams through Queued → Installing →
        Building → Deploying → Ready.
      </p>

      <h2 id="setup">Platform setup</h2>
      <p>On the API (Railway), set:</p>
      <CodeBlock
        language="bash"
        filename=".env"
        code={`CF_ACCOUNT_ID=your_cloudflare_account_id
CF_API_TOKEN=token_with_pages_edit
HOSTING_ROOT_DOMAIN=apps.voltbase.dev
# Optional dedicated GitHub OAuth (falls back to GITHUB_CLIENT_*)
HOSTING_GITHUB_CLIENT_ID=
HOSTING_GITHUB_CLIENT_SECRET=
HOSTING_GITHUB_CALLBACK_URL=https://api.example.com/api/hosting/github/callback`}
      />
      <p>
        Create a Cloudflare API token with <strong>Account → Cloudflare Pages →
        Edit</strong>. GitHub OAuth app callback must match{' '}
        <code>HOSTING_GITHUB_CALLBACK_URL</code> (or the default{' '}
        <code>/api/hosting/github/callback</code>).
      </p>

      <h2 id="deploy">Deploy a site</h2>
      <ol>
        <li>Connect GitHub from the Hosting empty state.</li>
        <li>Import a repository (search + org filters).</li>
        <li>
          Confirm auto-detected framework (edit build/output if needed).
        </li>
        <li>Click Deploy and watch the build theater.</li>
        <li>Visit the <code>*.pages.dev</code> URL when Ready.</li>
      </ol>

      <h2 id="env">Environment variables</h2>
      <p>System env (always injected for the detected framework):</p>
      <CodeBlock
        language="bash"
        filename="injected.env"
        code={`VOLTBASE_URL=https://api…/projects/your-slug
VOLTBASE_ANON_KEY=…
VITE_VOLTBASE_URL=…          # Vite
VITE_VOLTBASE_ANON_KEY=…
NEXT_PUBLIC_VOLTBASE_URL=…   # Next static export
NEXT_PUBLIC_VOLTBASE_ANON_KEY=…
PUBLIC_VOLTBASE_URL=…        # Astro / SvelteKit
NUXT_PUBLIC_VOLTBASE_URL=…   # Nuxt`}
      />

      <h2 id="frameworks">Frameworks</h2>
      <p>
        Supported on Free Pages: Vite React/Vue, Astro, Nuxt generate, SvelteKit
        (auto-pins <code>@sveltejs/adapter-cloudflare</code> when the repo uses{' '}
        <code>adapter-auto</code>), and Next.js with{' '}
        <code>output: &apos;export&apos;</code>. Full Next SSR needs Hosting Pro
        (Workers / OpenNext) — see the Edge Functions plan.
      </p>
      <p>
        Framework guides:{' '}
        <Link href="/docs/frameworks">Frameworks overview</Link>.
      </p>

      <h2 id="dns">Custom domain / DNS</h2>
      <p>
        Production alias target:{' '}
        <code>https://&#123;projectSlug&#125;.apps.voltbase.dev</code>. Point{' '}
        <code>apps.voltbase.dev</code> (or your root) at Cloudflare and attach
        each Pages project custom domain. Until DNS is ready, use the{' '}
        <code>*.pages.dev</code> URL shown in the dashboard.
      </p>

      <h2 id="limits">Limits</h2>
      <p>
        Cloudflare Free Pages: ~500 builds/mo (account), 1 concurrent build,{' '}
        <strong>100 projects max</strong>. Voltbase soft-caps near 95 and shows
        an upgrade CTA. Scale-out uses Workers for Platforms (~$25/mo), shared
        with Edge Functions.
      </p>
    </>
  ),
};
