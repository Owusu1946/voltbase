import Link from 'next/link';
import type { DocEntry } from '../registry';
import { CodeBlock } from '../code-block';
import { Callout } from '../docs-ui';
import {
  FrameworkCode,
  FrameworkProvider,
  FrameworkTabs,
} from '../framework-switcher';
import type { ExampleFrameworkId, FrameworkSnippet } from '../framework-switcher';

const matchSnippets = {
  nextjs: {
    filename: 'app/search/actions.ts',
    language: 'ts',
    code: `'use server';

import { createClient } from 'voltbase-js';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function semanticSearch(query: string) {
  const embed = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: query,
  });
  const query_embedding = embed.data[0]!.embedding;

  const voltbase = createClient(
    process.env.NEXT_PUBLIC_VOLTBASE_URL!,
    process.env.NEXT_PUBLIC_VOLTBASE_ANON_KEY!,
  );

  return voltbase.rpc('match_documents', {
    query_embedding,
    match_threshold: 0.7,
    match_count: 8,
  });
}`,
  },
  react: {
    filename: 'src/search.ts',
    language: 'ts',
    code: `import { voltbase } from './lib/voltbase';

// Prefer calling OpenAI from a server/proxy; browser keys are unsafe.
export async function semanticSearch(
  query_embedding: number[],
) {
  return voltbase.rpc('match_documents', {
    query_embedding,
    match_threshold: 0.7,
    match_count: 8,
  });
}`,
  },
  vue: {
    filename: 'src/search.ts',
    language: 'ts',
    code: `import { voltbase } from './lib/voltbase';

export async function semanticSearch(query_embedding: number[]) {
  return voltbase.rpc('match_documents', {
    query_embedding,
    match_threshold: 0.7,
    match_count: 8,
  });
}`,
  },
  nuxt: {
    filename: 'server/api/search.post.ts',
    language: 'ts',
    code: `import { createClient } from 'voltbase-js';
import OpenAI from 'openai';

export default defineEventHandler(async (event) => {
  const { query } = await readBody<{ query: string }>(event);
  const config = useRuntimeConfig();
  const openai = new OpenAI({ apiKey: config.openaiApiKey });
  const embed = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: query,
  });
  const voltbase = createClient(
    config.public.voltbaseUrl,
    config.public.voltbaseAnonKey,
  );
  return voltbase.rpc('match_documents', {
    query_embedding: embed.data[0]!.embedding,
    match_threshold: 0.7,
    match_count: 8,
  });
});`,
  },
  sveltekit: {
    filename: 'src/routes/search/+server.ts',
    language: 'ts',
    code: `import { json } from '@sveltejs/kit';
import { createClient } from 'voltbase-js';
import OpenAI from 'openai';
import {
  PUBLIC_VOLTBASE_URL,
  PUBLIC_VOLTBASE_ANON_KEY,
} from '$env/static/public';
import { OPENAI_API_KEY } from '$env/static/private';

export async function POST({ request }) {
  const { query } = await request.json();
  const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
  const embed = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: query,
  });
  const voltbase = createClient(PUBLIC_VOLTBASE_URL, PUBLIC_VOLTBASE_ANON_KEY);
  const result = await voltbase.rpc('match_documents', {
    query_embedding: embed.data[0]!.embedding,
    match_threshold: 0.7,
    match_count: 8,
  });
  return json(result);
}`,
  },
  astro: {
    filename: 'src/pages/api/search.ts',
    language: 'ts',
    code: `import type { APIRoute } from 'astro';
import { createClient } from 'voltbase-js';
import OpenAI from 'openai';

export const POST: APIRoute = async ({ request }) => {
  const { query } = await request.json();
  const openai = new OpenAI({ apiKey: import.meta.env.OPENAI_API_KEY });
  const embed = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: query,
  });
  const voltbase = createClient(
    import.meta.env.PUBLIC_VOLTBASE_URL,
    import.meta.env.PUBLIC_VOLTBASE_ANON_KEY,
  );
  const result = await voltbase.rpc('match_documents', {
    query_embedding: embed.data[0]!.embedding,
    match_threshold: 0.7,
    match_count: 8,
  });
  return new Response(JSON.stringify(result), {
    headers: { 'content-type': 'application/json' },
  });
};`,
  },
  expo: {
    filename: 'lib/search.ts',
    language: 'ts',
    code: `import { voltbase } from './voltbase';

// Call your backend to embed + match; keep OpenAI keys off-device.
export async function semanticSearch(query_embedding: number[]) {
  return voltbase.rpc('match_documents', {
    query_embedding,
    match_threshold: 0.7,
    match_count: 8,
  });
}`,
  },
  hono: {
    filename: 'src/search.ts',
    language: 'ts',
    code: `import { Hono } from 'hono';
import { createClient } from 'voltbase-js';
import OpenAI from 'openai';

const app = new Hono();

app.post('/search', async (c) => {
  const { query } = await c.req.json<{ query: string }>();
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const embed = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: query,
  });
  const voltbase = createClient(
    process.env.VOLTBASE_URL!,
    process.env.VOLTBASE_ANON_KEY!,
  );
  const result = await voltbase.rpc('match_documents', {
    query_embedding: embed.data[0]!.embedding,
    match_threshold: 0.7,
    match_count: 8,
  });
  return c.json(result);
});

export default app;`,
  },
} satisfies Record<ExampleFrameworkId, FrameworkSnippet>;

export const SemanticSearchPage: DocEntry = {
  title: 'Semantic search',
  description:
    'RAG-style doc search: store OpenAI embeddings in pgvector and query with match_documents.',
  toc: [
    { id: 'schema', title: '1. Schema + match function' },
    { id: 'index', title: '2. HNSW index' },
    { id: 'seed', title: '3. Seed embeddings' },
    { id: 'query', title: '4. Query from your app' },
  ],
  render: () => (
    <FrameworkProvider>
      <Callout title="What you'll build">
        A <code>documents</code> table with <code>vector(1536)</code>, a{' '}
        <code>match_documents</code> RPC, and a framework search handler using
        OpenAI + <code>voltbase-js</code>.
      </Callout>

      <h2 id="schema">1. Schema + match function</h2>
      <p>
        Run in SQL / Migrations (see also{' '}
        <Link href="/docs/database/vectors">Vectors</Link>):
      </p>
      <CodeBlock
        language="sql"
        filename="semantic.sql"
        code={`create extension if not exists vector;

create table documents (
  id uuid primary key default gen_random_uuid(),
  content text not null,
  embedding vector(1536) not null
);

create or replace function match_documents(
  query_embedding vector(1536),
  match_threshold float default 0.7,
  match_count int default 10
)
returns table (id uuid, content text, similarity float)
language sql stable
as $$
  select
    documents.id,
    documents.content,
    1 - (documents.embedding <=> query_embedding) as similarity
  from documents
  where 1 - (documents.embedding <=> query_embedding) > match_threshold
  order by documents.embedding <=> query_embedding
  limit match_count;
$$;`}
      />

      <h2 id="index">2. HNSW index</h2>
      <CodeBlock
        language="sql"
        filename="index.sql"
        code={`create index documents_embedding_hnsw
  on documents
  using hnsw (embedding vector_cosine_ops);`}
      />

      <h2 id="seed">3. Seed embeddings</h2>
      <CodeBlock
        language="ts"
        filename="seed.ts"
        code={`import { createClient } from 'voltbase-js';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const admin = createClient(projectUrl, serviceRoleKey);

const texts = [
  'Reset your password from Account → Security.',
  'Billing invoices are emailed on the 1st of each month.',
];

for (const content of texts) {
  const embed = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: content,
  });
  await admin.from('documents').insert({
    content,
    embedding: embed.data[0]!.embedding,
  });
}`}
      />

      <h2 id="query">4. Query from your app</h2>
      <p>Pick your framework:</p>
      <FrameworkTabs />
      <FrameworkCode snippets={matchSnippets} />
    </FrameworkProvider>
  ),
};
