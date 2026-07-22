import { createFrameworkGuide } from './create-framework-guide';

export const SveltekitGuidePage = createFrameworkGuide({
  framework: 'SvelteKit',
  title: 'Use Voltbase with SvelteKit',
  description:
    'Create a Voltbase project, add sample data, and query it from a SvelteKit app.',
  createApp: {
    command: `npx sv create voltbase-sveltekit
cd voltbase-sveltekit
npm install`,
    note: 'Pick the TypeScript template when prompted.',
  },
  env: {
    filename: '.env',
    code: `PUBLIC_VOLTBASE_URL=https://YOUR_API/api/projects/YOUR_SLUG
PUBLIC_VOLTBASE_ANON_KEY=your-anon-key`,
    tip: (
      <>
        SvelteKit exposes <code>PUBLIC_*</code> vars to the browser via{' '}
        <code>$env/static/public</code>.
      </>
    ),
  },
  client: {
    filename: 'src/lib/voltbase.ts',
    code: `import { createClient } from 'voltbase-js';
import {
  PUBLIC_VOLTBASE_URL,
  PUBLIC_VOLTBASE_ANON_KEY,
} from '$env/static/public';

export const voltbase = createClient(
  PUBLIC_VOLTBASE_URL,
  PUBLIC_VOLTBASE_ANON_KEY,
);`,
  },
  query: {
    filename: 'src/routes/+page.server.ts',
    language: 'ts',
    intro: (
      <>
        Load data in a server <code>load</code> function, then render in the
        page:
      </>
    ),
    code: `// src/routes/+page.server.ts
import { voltbase } from '$lib/voltbase';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
  const { data, error } = await voltbase
    .from('instruments')
    .select('id, name')
    .order('id', 'asc');

  if (error) throw new Error(error.message);
  return { instruments: data ?? [] };
};

// src/routes/+page.svelte
<script lang="ts">
  let { data } = $props();
</script>

<ul>
  {#each data.instruments as row}
    <li>{row.name}</li>
  {/each}
</ul>`,
  },
});
