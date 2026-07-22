import { createFrameworkGuide } from './create-framework-guide';

export const NuxtGuidePage = createFrameworkGuide({
  framework: 'Nuxt',
  title: 'Use Voltbase with Nuxt',
  description:
    'Create a Voltbase project, add sample data, and query it from a Nuxt app.',
  createApp: {
    command: `npx nuxi@latest init voltbase-nuxt
cd voltbase-nuxt
npm install`,
  },
  env: {
    filename: '.env',
    code: `NUXT_PUBLIC_VOLTBASE_URL=https://YOUR_API/api/projects/YOUR_SLUG
NUXT_PUBLIC_VOLTBASE_ANON_KEY=your-anon-key`,
    tip: (
      <>
        Public runtime config is available on both server and client. Keep
        service role keys out of <code>NUXT_PUBLIC_*</code>.
      </>
    ),
  },
  client: {
    filename: 'composables/useVoltbase.ts',
    code: `import { createClient } from 'voltbase-js';

export function useVoltbase() {
  const config = useRuntimeConfig();
  return createClient(
    config.public.voltbaseUrl as string,
    config.public.voltbaseAnonKey as string,
  );
}`,
  },
  query: {
    filename: 'nuxt.config.ts + pages/index.vue',
    language: 'ts',
    intro: (
      <>
        Wire public config in <code>nuxt.config.ts</code>, then fetch in a page:
      </>
    ),
    code: `// nuxt.config.ts
export default defineNuxtConfig({
  runtimeConfig: {
    public: {
      voltbaseUrl: process.env.NUXT_PUBLIC_VOLTBASE_URL,
      voltbaseAnonKey: process.env.NUXT_PUBLIC_VOLTBASE_ANON_KEY,
    },
  },
});

// pages/index.vue
<script setup lang="ts">
const voltbase = useVoltbase();
const { data: instruments, error } = await voltbase
  .from('instruments')
  .select('id, name')
  .order('id', 'asc');
</script>

<template>
  <p v-if="error">{{ error.message }}</p>
  <ul v-else>
    <li v-for="row in instruments" :key="row.id">{{ row.name }}</li>
  </ul>
</template>`,
  },
});
