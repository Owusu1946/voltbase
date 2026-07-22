import { createFrameworkGuide } from './create-framework-guide';

export const AstroGuidePage = createFrameworkGuide({
  framework: 'Astro',
  title: 'Use Voltbase with Astro',
  description:
    'Create a Voltbase project, add sample data, and query it from an Astro site.',
  createApp: {
    command: `npm create astro@latest voltbase-astro
cd voltbase-astro
npm install`,
  },
  env: {
    filename: '.env',
    code: `PUBLIC_VOLTBASE_URL=https://YOUR_API/api/projects/YOUR_SLUG
PUBLIC_VOLTBASE_ANON_KEY=your-anon-key`,
    tip: (
      <>
        Astro exposes <code>PUBLIC_*</code> to the client. Server-only secrets
        should omit the prefix.
      </>
    ),
  },
  client: {
    filename: 'src/lib/voltbase.ts',
    code: `import { createClient } from 'voltbase-js';

export const voltbase = createClient(
  import.meta.env.PUBLIC_VOLTBASE_URL,
  import.meta.env.PUBLIC_VOLTBASE_ANON_KEY,
);`,
  },
  query: {
    filename: 'src/pages/index.astro',
    language: 'ts',
    code: `---
import { voltbase } from '../lib/voltbase';

const { data: instruments, error } = await voltbase
  .from('instruments')
  .select('id, name')
  .order('id', 'asc');
---

<html lang="en">
  <body>
    {error ? (
      <p>Failed to load: {error.message}</p>
    ) : (
      <ul>
        {instruments?.map((row) => <li>{row.name}</li>)}
      </ul>
    )}
  </body>
</html>`,
  },
});
