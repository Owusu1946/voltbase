import { createFrameworkGuide } from './create-framework-guide';

export const HonoGuidePage = createFrameworkGuide({
  framework: 'Hono',
  title: 'Use Voltbase with Hono',
  description:
    'Create a Voltbase project, add sample data, and query it from a Hono API.',
  createApp: {
    command: `npm create hono@latest voltbase-hono
cd voltbase-hono
npm install`,
    note: 'Choose the Node.js or Cloudflare Workers runtime when prompted.',
  },
  env: {
    filename: '.env',
    code: `VOLTBASE_URL=https://YOUR_API/api/projects/YOUR_SLUG
VOLTBASE_ANON_KEY=your-anon-key
# Optional for writes:
# VOLTBASE_SERVICE_ROLE_KEY=your-service-role-key`,
    tip: (
      <>
        Hono runs on the server — you can use either the anon key (with RLS) or
        the service role for trusted writes.
      </>
    ),
  },
  client: {
    filename: 'src/voltbase.ts',
    code: `import { createClient } from 'voltbase-js';

export const voltbase = createClient(
  process.env.VOLTBASE_URL!,
  process.env.VOLTBASE_ANON_KEY!,
);`,
  },
  query: {
    filename: 'src/index.ts',
    language: 'ts',
    code: `import { Hono } from 'hono';
import { voltbase } from './voltbase';

const app = new Hono();

app.get('/instruments', async (c) => {
  const { data, error } = await voltbase
    .from('instruments')
    .select('id, name')
    .order('id', 'asc');

  if (error) return c.json({ error: error.message }, 500);
  return c.json({ data });
});

export default app;`,
  },
});
