import { createFrameworkGuide } from './create-framework-guide';

export const NextjsGuidePage = createFrameworkGuide({
  framework: 'Next.js',
  title: 'Use Voltbase with Next.js',
  description:
    'Create a Voltbase project, add sample data, and query it from a Next.js App Router app.',
  createApp: {
    command: `npx create-next-app@latest voltbase-nextjs --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
cd voltbase-nextjs`,
    note: 'Use the App Router so you can query from Server Components with the anon key.',
  },
  env: {
    filename: '.env.local',
    code: `NEXT_PUBLIC_VOLTBASE_URL=https://YOUR_API/api/projects/YOUR_SLUG
NEXT_PUBLIC_VOLTBASE_ANON_KEY=your-anon-key`,
    tip: (
      <>
        <code>NEXT_PUBLIC_</code> vars are available in the browser and on the
        server. Add a non-public service role var only if you need writes from
        Route Handlers or Server Actions.
      </>
    ),
  },
  client: {
    filename: 'src/lib/voltbase.ts',
    code: `import { createClient } from 'voltbase-js';

export function createVoltbaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_VOLTBASE_URL!,
    process.env.NEXT_PUBLIC_VOLTBASE_ANON_KEY!,
  );
}`,
  },
  query: {
    filename: 'src/app/instruments/page.tsx',
    language: 'tsx',
    intro: (
      <>
        Add a Server Component page that selects from{' '}
        <code>instruments</code>:
      </>
    ),
    code: `import { createVoltbaseClient } from '@/lib/voltbase';

export default async function InstrumentsPage() {
  const voltbase = createVoltbaseClient();
  const { data: instruments, error } = await voltbase
    .from('instruments')
    .select('id, name')
    .order('id', 'asc');

  if (error) {
    return <p>Failed to load: {error.message}</p>;
  }

  return (
    <ul>
      {(instruments ?? []).map((row) => (
        <li key={row.id}>{row.name}</li>
      ))}
    </ul>
  );
}`,
  },
});
