import type { ExampleFrameworkId, FrameworkSnippet } from '../framework-switcher';

type SnippetMap = Record<ExampleFrameworkId, FrameworkSnippet>;

export const avatarBucketSnippets: SnippetMap = {
  nextjs: {
    filename: 'scripts/create-bucket.ts',
    language: 'ts',
    code: `import { createClient } from 'voltbase-js';

const admin = createClient(
  process.env.VOLTBASE_URL!,
  process.env.VOLTBASE_SERVICE_ROLE_KEY!,
);

await admin.storage.createBucket('avatars', { public: true });`,
  },
  react: {
    filename: 'scripts/create-bucket.ts',
    language: 'ts',
    code: `import { createClient } from 'voltbase-js';

const admin = createClient(
  process.env.VOLTBASE_URL!,
  process.env.VOLTBASE_SERVICE_ROLE_KEY!,
);

await admin.storage.createBucket('avatars', { public: true });`,
  },
  vue: {
    filename: 'scripts/create-bucket.ts',
    language: 'ts',
    code: `import { createClient } from 'voltbase-js';

const admin = createClient(
  process.env.VOLTBASE_URL!,
  process.env.VOLTBASE_SERVICE_ROLE_KEY!,
);

await admin.storage.createBucket('avatars', { public: true });`,
  },
  nuxt: {
    filename: 'server/api/create-bucket.ts',
    language: 'ts',
    code: `import { createClient } from 'voltbase-js';

export default defineEventHandler(async () => {
  const config = useRuntimeConfig();
  const admin = createClient(
    config.voltbaseUrl,
    config.voltbaseServiceRoleKey,
  );
  await admin.storage.createBucket('avatars', { public: true });
  return { ok: true };
});`,
  },
  sveltekit: {
    filename: 'scripts/create-bucket.ts',
    language: 'ts',
    code: `import { createClient } from 'voltbase-js';

const admin = createClient(
  process.env.VOLTBASE_URL!,
  process.env.VOLTBASE_SERVICE_ROLE_KEY!,
);

await admin.storage.createBucket('avatars', { public: true });`,
  },
  astro: {
    filename: 'scripts/create-bucket.ts',
    language: 'ts',
    code: `import { createClient } from 'voltbase-js';

const admin = createClient(
  import.meta.env.VOLTBASE_URL,
  import.meta.env.VOLTBASE_SERVICE_ROLE_KEY,
);

await admin.storage.createBucket('avatars', { public: true });`,
  },
  expo: {
    filename: 'scripts/create-bucket.ts',
    language: 'ts',
    code: `import { createClient } from 'voltbase-js';

// Run once from a Node script / dashboard — not inside the app bundle.
const admin = createClient(
  process.env.VOLTBASE_URL!,
  process.env.VOLTBASE_SERVICE_ROLE_KEY!,
);

await admin.storage.createBucket('avatars', { public: true });`,
  },
  hono: {
    filename: 'src/storage.ts',
    language: 'ts',
    code: `import { Hono } from 'hono';
import { createClient } from 'voltbase-js';

const app = new Hono();
const admin = createClient(
  process.env.VOLTBASE_URL!,
  process.env.VOLTBASE_SERVICE_ROLE_KEY!,
);

app.post('/buckets/avatars', async (c) => {
  await admin.storage.createBucket('avatars', { public: true });
  return c.json({ ok: true });
});

export default app;`,
  },
};

export const avatarUploadSnippets: SnippetMap = {
  nextjs: {
    filename: 'app/avatar/page.tsx',
    language: 'tsx',
    code: `'use client';

import { createClient } from 'voltbase-js';

const voltbase = createClient(
  process.env.NEXT_PUBLIC_VOLTBASE_URL!,
  process.env.NEXT_PUBLIC_VOLTBASE_ANON_KEY!,
);

export default function AvatarPage() {
  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const bucket = voltbase.storage.from('avatars');
    const { data: uploaded, error } = await bucket.upload(file);
    if (error) return console.error(error);
    const { data: files } = await bucket.list();
    const { data: signed } = await bucket.getSignedUrl(uploaded!.id);
    console.log({ uploaded, files, signed });
  }

  return <input type="file" onChange={(e) => void onChange(e)} />;
}`,
  },
  react: {
    filename: 'src/AvatarUpload.tsx',
    language: 'tsx',
    code: `import { voltbase } from './lib/voltbase';

export function AvatarUpload() {
  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const bucket = voltbase.storage.from('avatars');
    const { data: uploaded, error } = await bucket.upload(file);
    if (error) return console.error(error);
    const { data: files } = await bucket.list();
    const { data: signed } = await bucket.getSignedUrl(uploaded!.id);
    console.log({ uploaded, files, signed });
  }

  return <input type="file" onChange={(e) => void onChange(e)} />;
}`,
  },
  vue: {
    filename: 'src/AvatarUpload.vue',
    language: 'ts',
    code: `<script setup lang="ts">
import { voltbase } from './lib/voltbase';

async function onChange(e: Event) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  const bucket = voltbase.storage.from('avatars');
  const { data: uploaded, error } = await bucket.upload(file);
  if (error) return console.error(error);
  const { data: files } = await bucket.list();
  const { data: signed } = await bucket.getSignedUrl(uploaded!.id);
  console.log({ uploaded, files, signed });
}
</script>

<template>
  <input type="file" @change="onChange" />
</template>`,
  },
  nuxt: {
    filename: 'pages/avatar.vue',
    language: 'ts',
    code: `<script setup lang="ts">
const voltbase = useVoltbase();

async function onChange(e: Event) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  const bucket = voltbase.storage.from('avatars');
  const { data: uploaded, error } = await bucket.upload(file);
  if (error) return console.error(error);
  const { data: files } = await bucket.list();
  const { data: signed } = await bucket.getSignedUrl(uploaded!.id);
  console.log({ uploaded, files, signed });
}
</script>

<template>
  <input type="file" @change="onChange" />
</template>`,
  },
  sveltekit: {
    filename: 'src/routes/avatar/+page.svelte',
    language: 'ts',
    code: `<script lang="ts">
  import { voltbase } from '$lib/voltbase';

  async function onChange(e: Event) {
    const input = e.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const bucket = voltbase.storage.from('avatars');
    const { data: uploaded, error } = await bucket.upload(file);
    if (error) return console.error(error);
    const { data: files } = await bucket.list();
    const { data: signed } = await bucket.getSignedUrl(uploaded!.id);
    console.log({ uploaded, files, signed });
  }
</script>

<input type="file" onchange={(e) => void onChange(e)} />`,
  },
  astro: {
    filename: 'src/pages/avatar.astro',
    language: 'ts',
    code: `---
---
<input id="file" type="file" />
<script>
  import { createClient } from 'voltbase-js';

  const voltbase = createClient(
    import.meta.env.PUBLIC_VOLTBASE_URL,
    import.meta.env.PUBLIC_VOLTBASE_ANON_KEY,
  );

  document.getElementById('file')!.onchange = async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const bucket = voltbase.storage.from('avatars');
    const { data: uploaded, error } = await bucket.upload(file);
    if (error) return console.error(error);
    const { data: files } = await bucket.list();
    const { data: signed } = await bucket.getSignedUrl(uploaded.id);
    console.log({ uploaded, files, signed });
  };
</script>`,
  },
  expo: {
    filename: 'AvatarScreen.tsx',
    language: 'tsx',
    code: `import * as DocumentPicker from 'expo-document-picker';
import { Button, View } from 'react-native';
import { voltbase } from './lib/voltbase';

export function AvatarScreen() {
  async function pickAndUpload() {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'image/*',
    });
    if (result.canceled) return;
    const asset = result.assets[0]!;
    const res = await fetch(asset.uri);
    const blob = await res.blob();
    const file = new File([blob], asset.name ?? 'avatar.jpg', {
      type: asset.mimeType ?? 'image/jpeg',
    });

    const bucket = voltbase.storage.from('avatars');
    const { data: uploaded, error } = await bucket.upload(file);
    if (error) return console.error(error);
    const { data: files } = await bucket.list();
    const { data: signed } = await bucket.getSignedUrl(uploaded!.id);
    console.log({ uploaded, files, signed });
  }

  return (
    <View style={{ padding: 24 }}>
      <Button title="Upload avatar" onPress={() => void pickAndUpload()} />
    </View>
  );
}`,
  },
  hono: {
    filename: 'src/upload.ts',
    language: 'ts',
    code: `import { Hono } from 'hono';
import { createClient } from 'voltbase-js';

const app = new Hono();
const voltbase = createClient(
  process.env.VOLTBASE_URL!,
  process.env.VOLTBASE_ANON_KEY!,
);

app.post('/avatars', async (c) => {
  const form = await c.req.formData();
  const file = form.get('file');
  if (!(file instanceof File)) {
    return c.json({ error: 'file required' }, 400);
  }
  const bucket = voltbase.storage.from('avatars');
  const { data, error } = await bucket.upload(file);
  if (error) return c.json({ error: error.message }, 400);
  return c.json({ data });
});

export default app;`,
  },
};
