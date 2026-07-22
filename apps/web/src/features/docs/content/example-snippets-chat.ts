import type { ExampleFrameworkId, FrameworkSnippet } from '../framework-switcher';

type SnippetMap = Record<ExampleFrameworkId, FrameworkSnippet>;

export const chatRealtimeSnippets: SnippetMap = {
  nextjs: {
    filename: 'app/chat/page.tsx',
    language: 'tsx',
    code: `'use client';

import { useEffect, useState } from 'react';
import { createClient } from 'voltbase-js';

const voltbase = createClient(
  process.env.NEXT_PUBLIC_VOLTBASE_URL!,
  process.env.NEXT_PUBLIC_VOLTBASE_ANON_KEY!,
);

type Message = { id: string; author: string; body: string };

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    const unsub = voltbase.realtime.subscribe(
      'messages',
      (event) => {
        if (event.type === 'INSERT') {
          setMessages((prev) => [...prev, event.record as Message]);
        }
      },
      { event: 'INSERT', filter: { room: 'lobby' } },
    );
    return () => unsub();
  }, []);

  async function send(body: string) {
    await voltbase.from('messages').insert({
      room: 'lobby',
      author: 'alice',
      body,
    });
  }

  return (
    <div>
      <ul>
        {messages.map((m) => (
          <li key={m.id}>
            <strong>{m.author}</strong>: {m.body}
          </li>
        ))}
      </ul>
      <button onClick={() => void send('Hello!')}>Send</button>
    </div>
  );
}`,
  },
  react: {
    filename: 'src/Chat.tsx',
    language: 'tsx',
    code: `import { useEffect, useState } from 'react';
import { voltbase } from './lib/voltbase';

type Message = { id: string; author: string; body: string };

export function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    const unsub = voltbase.realtime.subscribe(
      'messages',
      (event) => {
        if (event.type === 'INSERT') {
          setMessages((prev) => [...prev, event.record as Message]);
        }
      },
      { event: 'INSERT', filter: { room: 'lobby' } },
    );
    return () => unsub();
  }, []);

  async function send(body: string) {
    await voltbase.from('messages').insert({
      room: 'lobby',
      author: 'alice',
      body,
    });
  }

  return (
    <div>
      <ul>
        {messages.map((m) => (
          <li key={m.id}>
            <strong>{m.author}</strong>: {m.body}
          </li>
        ))}
      </ul>
      <button onClick={() => void send('Hello!')}>Send</button>
    </div>
  );
}`,
  },
  vue: {
    filename: 'src/Chat.vue',
    language: 'ts',
    code: `<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import { voltbase } from './lib/voltbase';

type Message = { id: string; author: string; body: string };

const messages = ref<Message[]>([]);
let unsub: (() => void) | undefined;

onMounted(() => {
  unsub = voltbase.realtime.subscribe(
    'messages',
    (event) => {
      if (event.type === 'INSERT') {
        messages.value.push(event.record as Message);
      }
    },
    { event: 'INSERT', filter: { room: 'lobby' } },
  );
});

onUnmounted(() => unsub?.());

async function send(body: string) {
  await voltbase.from('messages').insert({
    room: 'lobby',
    author: 'alice',
    body,
  });
}
</script>

<template>
  <ul>
    <li v-for="m in messages" :key="m.id">
      <strong>{{ m.author }}</strong>: {{ m.body }}
    </li>
  </ul>
  <button @click="send('Hello!')">Send</button>
</template>`,
  },
  nuxt: {
    filename: 'pages/chat.vue',
    language: 'ts',
    code: `<script setup lang="ts">
const voltbase = useVoltbase();

type Message = { id: string; author: string; body: string };
const messages = ref<Message[]>([]);
let unsub: (() => void) | undefined;

onMounted(() => {
  unsub = voltbase.realtime.subscribe(
    'messages',
    (event) => {
      if (event.type === 'INSERT') {
        messages.value.push(event.record as Message);
      }
    },
    { event: 'INSERT', filter: { room: 'lobby' } },
  );
});

onUnmounted(() => unsub?.());

async function send(body: string) {
  await voltbase.from('messages').insert({
    room: 'lobby',
    author: 'alice',
    body,
  });
}
</script>

<template>
  <ul>
    <li v-for="m in messages" :key="m.id">
      <strong>{{ m.author }}</strong>: {{ m.body }}
    </li>
  </ul>
  <button @click="send('Hello!')">Send</button>
</template>`,
  },
  sveltekit: {
    filename: 'src/routes/chat/+page.svelte',
    language: 'ts',
    code: `<script lang="ts">
  import { onMount } from 'svelte';
  import { voltbase } from '$lib/voltbase';

  type Message = { id: string; author: string; body: string };
  let messages = $state<Message[]>([]);

  onMount(() => {
    return voltbase.realtime.subscribe(
      'messages',
      (event) => {
        if (event.type === 'INSERT') {
          messages = [...messages, event.record as Message];
        }
      },
      { event: 'INSERT', filter: { room: 'lobby' } },
    );
  });

  async function send(body: string) {
    await voltbase.from('messages').insert({
      room: 'lobby',
      author: 'alice',
      body,
    });
  }
</script>

<ul>
  {#each messages as m}
    <li><strong>{m.author}</strong>: {m.body}</li>
  {/each}
</ul>
<button onclick={() => void send('Hello!')}>Send</button>`,
  },
  astro: {
    filename: 'src/pages/chat.astro',
    language: 'ts',
    code: `---
---
<div id="chat"></div>
<script>
  import { createClient } from 'voltbase-js';

  const voltbase = createClient(
    import.meta.env.PUBLIC_VOLTBASE_URL,
    import.meta.env.PUBLIC_VOLTBASE_ANON_KEY,
  );

  const root = document.getElementById('chat')!;
  const list = document.createElement('ul');
  const button = document.createElement('button');
  button.textContent = 'Send';
  root.append(list, button);

  voltbase.realtime.subscribe(
    'messages',
    (event) => {
      if (event.type !== 'INSERT') return;
      const li = document.createElement('li');
      li.textContent = \`\${event.record.author}: \${event.record.body}\`;
      list.append(li);
    },
    { event: 'INSERT', filter: { room: 'lobby' } },
  );

  button.onclick = async () => {
    await voltbase.from('messages').insert({
      room: 'lobby',
      author: 'alice',
      body: 'Hello!',
    });
  };
</script>`,
  },
  expo: {
    filename: 'ChatScreen.tsx',
    language: 'tsx',
    code: `import { useEffect, useState } from 'react';
import { Button, FlatList, Text, View } from 'react-native';
import { voltbase } from './lib/voltbase';

type Message = { id: string; author: string; body: string };

export function ChatScreen() {
  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    return voltbase.realtime.subscribe(
      'messages',
      (event) => {
        if (event.type === 'INSERT') {
          setMessages((prev) => [...prev, event.record as Message]);
        }
      },
      { event: 'INSERT', filter: { room: 'lobby' } },
    );
  }, []);

  return (
    <View style={{ padding: 24, gap: 12 }}>
      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Text>
            {item.author}: {item.body}
          </Text>
        )}
      />
      <Button
        title="Send"
        onPress={() =>
          void voltbase.from('messages').insert({
            room: 'lobby',
            author: 'alice',
            body: 'Hello!',
          })
        }
      />
    </View>
  );
}`,
  },
  hono: {
    filename: 'src/chat.ts',
    language: 'ts',
    code: `import { Hono } from 'hono';
import { createClient } from 'voltbase-js';

const app = new Hono();
const voltbase = createClient(
  process.env.VOLTBASE_URL!,
  process.env.VOLTBASE_SERVICE_ROLE_KEY!,
);

// Insert from your API; subscribe from a browser/Expo client.
app.post('/messages', async (c) => {
  const body = await c.req.json<{
    room: string;
    author: string;
    body: string;
  }>();
  const { data, error } = await voltbase.from('messages').insert(body);
  if (error) return c.json({ error: error.message }, 400);
  return c.json({ data });
});

export default app;

// Client (browser):
// voltbase.realtime.subscribe('messages', handler, {
//   event: 'INSERT',
//   filter: { room: 'lobby' },
// });`,
  },
};

export const chatPresenceSnippets: SnippetMap = {
  nextjs: {
    filename: 'lib/presence.ts',
    language: 'ts',
    code: `const channel = voltbase.realtime.channel('lobby');

channel
  .on('presence', { event: 'sync' }, ({ state }) => {
    console.log('online', state);
  })
  .subscribe();

channel.track({ user: 'alice' });`,
  },
  react: {
    filename: 'src/presence.ts',
    language: 'ts',
    code: `import { voltbase } from './lib/voltbase';

const channel = voltbase.realtime.channel('lobby');

channel
  .on('presence', { event: 'sync' }, ({ state }) => {
    console.log('online', state);
  })
  .subscribe();

channel.track({ user: 'alice' });`,
  },
  vue: {
    filename: 'src/presence.ts',
    language: 'ts',
    code: `import { voltbase } from './lib/voltbase';

const channel = voltbase.realtime.channel('lobby');

channel
  .on('presence', { event: 'sync' }, ({ state }) => {
    console.log('online', state);
  })
  .subscribe();

channel.track({ user: 'alice' });`,
  },
  nuxt: {
    filename: 'composables/usePresence.ts',
    language: 'ts',
    code: `export function usePresence(room = 'lobby') {
  const voltbase = useVoltbase();
  const online = ref<Record<string, unknown>>({});

  onMounted(() => {
    const channel = voltbase.realtime.channel(room);
    channel
      .on('presence', { event: 'sync' }, ({ state }) => {
        online.value = state;
      })
      .subscribe();
    channel.track({ user: 'alice' });
  });

  return { online };
}`,
  },
  sveltekit: {
    filename: 'src/lib/presence.ts',
    language: 'ts',
    code: `import { voltbase } from '$lib/voltbase';

const channel = voltbase.realtime.channel('lobby');

channel
  .on('presence', { event: 'sync' }, ({ state }) => {
    console.log('online', state);
  })
  .subscribe();

channel.track({ user: 'alice' });`,
  },
  astro: {
    filename: 'src/presence.js',
    language: 'ts',
    code: `import { createClient } from 'voltbase-js';

const voltbase = createClient(
  import.meta.env.PUBLIC_VOLTBASE_URL,
  import.meta.env.PUBLIC_VOLTBASE_ANON_KEY,
);

const channel = voltbase.realtime.channel('lobby');
channel
  .on('presence', { event: 'sync' }, ({ state }) => {
    console.log('online', state);
  })
  .subscribe();
channel.track({ user: 'alice' });`,
  },
  expo: {
    filename: 'lib/presence.ts',
    language: 'ts',
    code: `import { voltbase } from './voltbase';

const channel = voltbase.realtime.channel('lobby');

channel
  .on('presence', { event: 'sync' }, ({ state }) => {
    console.log('online', state);
  })
  .subscribe();

channel.track({ user: 'alice' });`,
  },
  hono: {
    filename: 'note.ts',
    language: 'ts',
    code: `// Presence is a client concern — track from the browser/Expo app
// connected to the same Voltbase project. Your Hono API can still
// insert messages; clients call channel.track({ user: 'alice' }).`,
  },
};
