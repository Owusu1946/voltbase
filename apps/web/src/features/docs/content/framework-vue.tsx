import { createFrameworkGuide } from './create-framework-guide';

export const VueGuidePage = createFrameworkGuide({
  framework: 'Vue',
  title: 'Use Voltbase with Vue',
  description:
    'Create a Voltbase project, add sample data, and query it from a Vite Vue app.',
  createApp: {
    command: `npm create vite@latest voltbase-vue -- --template vue-ts
cd voltbase-vue
npm install`,
  },
  env: {
    filename: '.env',
    code: `VITE_VOLTBASE_URL=https://YOUR_API/api/projects/YOUR_SLUG
VITE_VOLTBASE_ANON_KEY=your-anon-key`,
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
    filename: 'src/App.vue',
    language: 'ts',
    code: `<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { voltbase } from './lib/voltbase';

type Instrument = { id: number; name: string };

const rows = ref<Instrument[]>([]);
const error = ref<string | null>(null);

onMounted(async () => {
  const { data, error: err } = await voltbase
    .from('instruments')
    .select('id, name')
    .order('id', 'asc');
  if (err) error.value = err.message;
  else rows.value = (data as Instrument[]) ?? [];
});
</script>

<template>
  <p v-if="error">{{ error }}</p>
  <ul v-else>
    <li v-for="row in rows" :key="row.id">{{ row.name }}</li>
  </ul>
</template>`,
  },
});
