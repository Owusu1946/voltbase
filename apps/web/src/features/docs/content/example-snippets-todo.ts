import type { ExampleFrameworkId, FrameworkSnippet } from '../framework-switcher';

type SnippetMap = Record<ExampleFrameworkId, FrameworkSnippet>;

export const todoClientSnippets: SnippetMap = {
  nextjs: {
    filename: 'app/todos/page.tsx',
    language: 'tsx',
    code: `'use client';

import { useEffect, useState } from 'react';
import { createClient } from 'voltbase-js';

const voltbase = createClient(
  process.env.NEXT_PUBLIC_VOLTBASE_URL!,
  process.env.NEXT_PUBLIC_VOLTBASE_ANON_KEY!,
);

type Todo = { id: string; title: string; done: boolean };

export default function TodosPage() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [title, setTitle] = useState('');

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    const { data } = await voltbase
      .from('todos')
      .select('*')
      .order('created_at', 'desc');
    setTodos((data as Todo[]) ?? []);
  }

  async function addTodo() {
    const user = voltbase.auth.getUser();
    if (!user) {
      await voltbase.auth.signUp({
        email: 'you@example.com',
        password: 'password123',
      });
    }
    await voltbase.from('todos').insert({
      user_id: voltbase.auth.getUser()!.id,
      title,
    });
    setTitle('');
    await load();
  }

  return (
    <div>
      <input value={title} onChange={(e) => setTitle(e.target.value)} />
      <button onClick={() => void addTodo()}>Add</button>
      <ul>
        {todos.map((t) => (
          <li key={t.id}>{t.title}</li>
        ))}
      </ul>
    </div>
  );
}`,
  },
  react: {
    filename: 'src/App.tsx',
    language: 'tsx',
    code: `import { useEffect, useState } from 'react';
import { voltbase } from './lib/voltbase';

type Todo = { id: string; title: string; done: boolean };

export default function App() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [title, setTitle] = useState('');

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    const { data } = await voltbase
      .from('todos')
      .select('*')
      .order('created_at', 'desc');
    setTodos((data as Todo[]) ?? []);
  }

  async function addTodo() {
    let user = voltbase.auth.getUser();
    if (!user) {
      await voltbase.auth.signUp({
        email: 'you@example.com',
        password: 'password123',
      });
      user = voltbase.auth.getUser();
    }
    await voltbase.from('todos').insert({
      user_id: user!.id,
      title,
    });
    setTitle('');
    await load();
  }

  return (
    <div>
      <input value={title} onChange={(e) => setTitle(e.target.value)} />
      <button onClick={() => void addTodo()}>Add</button>
      <ul>
        {todos.map((t) => (
          <li key={t.id}>{t.title}</li>
        ))}
      </ul>
    </div>
  );
}`,
  },
  vue: {
    filename: 'src/App.vue',
    language: 'ts',
    code: `<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { voltbase } from './lib/voltbase';

type Todo = { id: string; title: string; done: boolean };

const todos = ref<Todo[]>([]);
const title = ref('');

async function load() {
  const { data } = await voltbase
    .from('todos')
    .select('*')
    .order('created_at', 'desc');
  todos.value = (data as Todo[]) ?? [];
}

async function addTodo() {
  let user = voltbase.auth.getUser();
  if (!user) {
    await voltbase.auth.signUp({
      email: 'you@example.com',
      password: 'password123',
    });
    user = voltbase.auth.getUser();
  }
  await voltbase.from('todos').insert({
    user_id: user!.id,
    title: title.value,
  });
  title.value = '';
  await load();
}

onMounted(() => void load());
</script>

<template>
  <input v-model="title" />
  <button @click="addTodo">Add</button>
  <ul>
    <li v-for="t in todos" :key="t.id">{{ t.title }}</li>
  </ul>
</template>`,
  },
  nuxt: {
    filename: 'pages/todos.vue',
    language: 'ts',
    code: `<script setup lang="ts">
const voltbase = useVoltbase();

type Todo = { id: string; title: string; done: boolean };

const todos = ref<Todo[]>([]);
const title = ref('');

async function load() {
  const { data } = await voltbase
    .from('todos')
    .select('*')
    .order('created_at', 'desc');
  todos.value = (data as Todo[]) ?? [];
}

async function addTodo() {
  let user = voltbase.auth.getUser();
  if (!user) {
    await voltbase.auth.signUp({
      email: 'you@example.com',
      password: 'password123',
    });
    user = voltbase.auth.getUser();
  }
  await voltbase.from('todos').insert({
    user_id: user!.id,
    title: title.value,
  });
  title.value = '';
  await load();
}

onMounted(() => void load());
</script>

<template>
  <input v-model="title" />
  <button @click="addTodo">Add</button>
  <ul>
    <li v-for="t in todos" :key="t.id">{{ t.title }}</li>
  </ul>
</template>`,
  },
  sveltekit: {
    filename: 'src/routes/todos/+page.svelte',
    language: 'ts',
    code: `<script lang="ts">
  import { onMount } from 'svelte';
  import { voltbase } from '$lib/voltbase';

  type Todo = { id: string; title: string; done: boolean };

  let todos = $state<Todo[]>([]);
  let title = $state('');

  async function load() {
    const { data } = await voltbase
      .from('todos')
      .select('*')
      .order('created_at', 'desc');
    todos = (data as Todo[]) ?? [];
  }

  async function addTodo() {
    let user = voltbase.auth.getUser();
    if (!user) {
      await voltbase.auth.signUp({
        email: 'you@example.com',
        password: 'password123',
      });
      user = voltbase.auth.getUser();
    }
    await voltbase.from('todos').insert({
      user_id: user!.id,
      title,
    });
    title = '';
    await load();
  }

  onMount(() => void load());
</script>

<input bind:value={title} />
<button onclick={() => void addTodo()}>Add</button>
<ul>
  {#each todos as t}
    <li>{t.title}</li>
  {/each}
</ul>`,
  },
  astro: {
    filename: 'src/pages/todos.astro',
    language: 'ts',
    code: `---
// Prefer a client island for auth + inserts.
// Example using a small script tag after hydrate:
---

<html lang="en">
  <body>
    <div id="app"></div>
    <script>
      import { createClient } from 'voltbase-js';

      const voltbase = createClient(
        import.meta.env.PUBLIC_VOLTBASE_URL,
        import.meta.env.PUBLIC_VOLTBASE_ANON_KEY,
      );

      const root = document.getElementById('app')!;
      const input = document.createElement('input');
      const button = document.createElement('button');
      button.textContent = 'Add';
      const list = document.createElement('ul');
      root.append(input, button, list);

      async function load() {
        const { data } = await voltbase
          .from('todos')
          .select('*')
          .order('created_at', 'desc');
        list.innerHTML = '';
        for (const t of data ?? []) {
          const li = document.createElement('li');
          li.textContent = t.title;
          list.append(li);
        }
      }

      button.onclick = async () => {
        let user = voltbase.auth.getUser();
        if (!user) {
          await voltbase.auth.signUp({
            email: 'you@example.com',
            password: 'password123',
          });
          user = voltbase.auth.getUser();
        }
        await voltbase.from('todos').insert({
          user_id: user.id,
          title: input.value,
        });
        input.value = '';
        await load();
      };

      await load();
    </script>
  </body>
</html>`,
  },
  expo: {
    filename: 'App.tsx',
    language: 'tsx',
    code: `import { useEffect, useState } from 'react';
import { Button, FlatList, Text, TextInput, View } from 'react-native';
import { voltbase } from './lib/voltbase';

type Todo = { id: string; title: string; done: boolean };

export default function App() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [title, setTitle] = useState('');

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    const { data } = await voltbase
      .from('todos')
      .select('*')
      .order('created_at', 'desc');
    setTodos((data as Todo[]) ?? []);
  }

  async function addTodo() {
    let user = voltbase.auth.getUser();
    if (!user) {
      await voltbase.auth.signUp({
        email: 'you@example.com',
        password: 'password123',
      });
      user = voltbase.auth.getUser();
    }
    await voltbase.from('todos').insert({
      user_id: user!.id,
      title,
    });
    setTitle('');
    await load();
  }

  return (
    <View style={{ padding: 24, gap: 12 }}>
      <TextInput value={title} onChangeText={setTitle} placeholder="Todo" />
      <Button title="Add" onPress={() => void addTodo()} />
      <FlatList
        data={todos}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <Text>{item.title}</Text>}
      />
    </View>
  );
}`,
  },
  hono: {
    filename: 'src/todos.ts',
    language: 'ts',
    code: `import { Hono } from 'hono';
import { createClient } from 'voltbase-js';

const app = new Hono();

// Prefer the user JWT from Authorization when calling from a UI.
app.post('/todos', async (c) => {
  const auth = c.req.header('Authorization') ?? '';
  const jwt = auth.replace(/^Bearer\\s+/i, '');
  const voltbase = createClient(
    process.env.VOLTBASE_URL!,
    process.env.VOLTBASE_ANON_KEY!,
  );
  if (jwt) voltbase.auth.setSession({ accessToken: jwt });

  const body = await c.req.json<{ title: string }>();
  const user = voltbase.auth.getUser();
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const { data, error } = await voltbase.from('todos').insert({
    user_id: user.id,
    title: body.title,
  });
  if (error) return c.json({ error: error.message }, 400);
  return c.json({ data });
});

app.get('/todos', async (c) => {
  const auth = c.req.header('Authorization') ?? '';
  const jwt = auth.replace(/^Bearer\\s+/i, '');
  const voltbase = createClient(
    process.env.VOLTBASE_URL!,
    process.env.VOLTBASE_ANON_KEY!,
  );
  if (jwt) voltbase.auth.setSession({ accessToken: jwt });

  const { data, error } = await voltbase
    .from('todos')
    .select('*')
    .order('created_at', 'desc');
  if (error) return c.json({ error: error.message }, 400);
  return c.json({ data });
});

export default app;`,
  },
};
