import { createFrameworkGuide } from './create-framework-guide';

export const ReactGuidePage = createFrameworkGuide({
  framework: 'React',
  title: 'Use Voltbase with React',
  description:
    'Create a Voltbase project, add sample data, and query it from a Vite React app.',
  createApp: {
    command: `npm create vite@latest voltbase-react -- --template react-ts
cd voltbase-react
npm install`,
  },
  env: {
    filename: '.env',
    code: `VITE_VOLTBASE_URL=https://YOUR_API/api/projects/YOUR_SLUG
VITE_VOLTBASE_ANON_KEY=your-anon-key`,
    tip: (
      <>
        Vite only exposes variables prefixed with <code>VITE_</code> to the
        client.
      </>
    ),
  },
  client: {
    filename: 'src/lib/voltbase.ts',
    code: `import { createClient } from 'voltbase-js';

export const voltbase = createClient(
  import.meta.env.VITE_VOLTBASE_URL,
  import.meta.env.VITE_VOLTBASE_ANON_KEY,
);`,
  },
  query: {
    filename: 'src/App.tsx',
    language: 'tsx',
    code: `import { useEffect, useState } from 'react';
import { voltbase } from './lib/voltbase';

type Instrument = { id: number; name: string };

export default function App() {
  const [rows, setRows] = useState<Instrument[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const { data, error } = await voltbase
        .from('instruments')
        .select('id, name')
        .order('id', 'asc');
      if (error) setError(error.message);
      else setRows((data as Instrument[]) ?? []);
    })();
  }, []);

  if (error) return <p>{error}</p>;

  return (
    <ul>
      {rows.map((row) => (
        <li key={row.id}>{row.name}</li>
      ))}
    </ul>
  );
}`,
  },
});
