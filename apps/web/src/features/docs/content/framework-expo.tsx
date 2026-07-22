import { createFrameworkGuide } from './create-framework-guide';

export const ExpoGuidePage = createFrameworkGuide({
  framework: 'Expo',
  title: 'Use Voltbase with Expo',
  description:
    'Create a Voltbase project, add sample data, and query it from an Expo React Native app.',
  createApp: {
    command: `npx create-expo-app@latest voltbase-expo --template blank-typescript
cd voltbase-expo`,
  },
  env: {
    filename: '.env',
    code: `EXPO_PUBLIC_VOLTBASE_URL=https://YOUR_API/api/projects/YOUR_SLUG
EXPO_PUBLIC_VOLTBASE_ANON_KEY=your-anon-key`,
    tip: (
      <>
        Restart the Expo bundler after changing env vars. Only{' '}
        <code>EXPO_PUBLIC_*</code> values are available in the app.
      </>
    ),
  },
  client: {
    filename: 'lib/voltbase.ts',
    code: `import { createClient } from 'voltbase-js';

export const voltbase = createClient(
  process.env.EXPO_PUBLIC_VOLTBASE_URL!,
  process.env.EXPO_PUBLIC_VOLTBASE_ANON_KEY!,
);`,
  },
  query: {
    filename: 'App.tsx',
    language: 'tsx',
    code: `import { useEffect, useState } from 'react';
import { Text, FlatList, Text } from 'react-native';
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

  if (error) return <Text>{error}</Text>;

  return (
    <FlatList
      data={rows}
      keyExtractor={(item) => String(item.id)}
      renderItem={({ item }) => <Text>{item.name}</Text>}
      contentContainerStyle={{ padding: 24 }}
    />
  );
}`,
  },
});
