import Link from 'next/link';
import type { DocEntry } from '../registry';
import { CodeBlock } from '../code-block';
import { Callout } from '../docs-ui';

export const VectorsPage: DocEntry = {
  title: 'Vectors (pgvector)',
  description:
    'Store embeddings in Postgres with pgvector and run similarity search via RPC — the same model as Supabase Vector.',
  toc: [
    { id: 'enable', title: '1. Enable pgvector' },
    { id: 'column', title: '2. Vector columns' },
    { id: 'insert', title: '3. Insert embeddings' },
    { id: 'index', title: '4. HNSW index' },
    { id: 'match', title: '5. match_* + rpc()' },
    { id: 'rls', title: '6. RLS & grants' },
    { id: 'metadata', title: '7. Metadata filters' },
  ],
  render: () => (
    <>
      <Callout variant="info" title="Bring your own embeddings">
        Voltbase stores and queries vectors. Generate embeddings with OpenAI,
        Hugging Face, or any model — dimensions must match the column (default{' '}
        <code>1536</code>).
      </Callout>

      <h2 id="enable">1. Enable pgvector</h2>
      <p>
        The <code>vector</code> extension is enabled automatically on new
        projects. Confirm under dashboard{' '}
        <strong>Extensions</strong>, or run:
      </p>
      <CodeBlock
        language="sql"
        filename="enable.sql"
        code={`create extension if not exists vector;`}
      />

      <h2 id="column">2. Vector columns</h2>
      <p>
        In the table editor pick type <code>vector</code> and set dimensions, or
        SQL:
      </p>
      <CodeBlock
        language="sql"
        filename="schema.sql"
        code={`create table documents (
  id uuid primary key default gen_random_uuid(),
  content text not null,
  embedding vector(1536),
  user_id uuid,
  created_at timestamptz not null default now()
);`}
      />

      <h2 id="insert">3. Insert embeddings</h2>
      <p>
        Pass a <code>number[]</code> from the SDK — Voltbase casts it to{' '}
        <code>vector</code>:
      </p>
      <CodeBlock
        language="ts"
        filename="insert.ts"
        code={`import { createClient } from 'voltbase-js';

const voltbase = createClient(projectUrl, anonKey);

// embedding = await openai.embeddings.create(...).data[0].embedding
const embedding: number[] = /* length 1536 */;

const { data, error } = await voltbase.from('documents').insert({
  content: 'How do I reset my password?',
  embedding,
});`}
      />

      <h2 id="index">4. HNSW index</h2>
      <p>
        From the table <strong>Indexes</strong> tab choose method{' '}
        <code>hnsw</code> and ops <code>vector_cosine_ops</code>, or:
      </p>
      <CodeBlock
        language="sql"
        filename="index.sql"
        code={`create index documents_embedding_hnsw
  on documents
  using hnsw (embedding vector_cosine_ops);`}
      />

      <h2 id="match">5. match_* + rpc()</h2>
      <p>
        Like Supabase JS, similarity operators are exposed through a SQL
        function and <code>rpc()</code>:
      </p>
      <CodeBlock
        language="sql"
        filename="match_documents.sql"
        code={`create or replace function match_documents(
  query_embedding vector(1536),
  match_threshold float default 0.7,
  match_count int default 10
)
returns table (
  id uuid,
  content text,
  similarity float
)
language sql
stable
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
      <CodeBlock
        language="ts"
        filename="search.ts"
        code={`const { data, error } = await voltbase.rpc('match_documents', {
  query_embedding: queryVec,
  match_threshold: 0.78,
  match_count: 10,
});`}
      />

      <h2 id="rls">6. RLS &amp; grants</h2>
      <p>
        Keep functions as <strong>SECURITY INVOKER</strong> (default) so RLS
        applies. Grant execute to project roles (replace{' '}
        <code>proj_xxxx</code> with your schema from the dashboard):
      </p>
      <CodeBlock
        language="sql"
        filename="grants.sql"
        code={`grant execute on function match_documents(vector, float, int)
  to "proj_xxxx_anon", "proj_xxxx_authenticated";`}
      />
      <Callout variant="tip">
        New functions in the project schema already get{' '}
        <code>EXECUTE</code> via default privileges for anon/authenticated when
        created by the connection role — still verify with a test{' '}
        <code>rpc()</code> call using the anon key.
      </Callout>

      <h2 id="metadata">7. Metadata filters</h2>
      <p>
        Extend the function with extra params (Supabase pattern):
      </p>
      <CodeBlock
        language="sql"
        filename="match_filtered.sql"
        code={`create or replace function match_documents(
  query_embedding vector(1536),
  match_threshold float default 0.7,
  match_count int default 10,
  filter_user_id uuid default null
)
returns table (id uuid, content text, similarity float)
language sql stable
as $$
  select
    documents.id,
    documents.content,
    1 - (documents.embedding <=> query_embedding) as similarity
  from documents
  where
    (filter_user_id is null or documents.user_id = filter_user_id)
    and 1 - (documents.embedding <=> query_embedding) > match_threshold
  order by documents.embedding <=> query_embedding
  limit match_count;
$$;`}
      />

      <p>
        Next:{' '}
        <Link href="/docs/examples/semantic-search">Semantic search example</Link>{' '}
        or <Link href="/docs/database/rls">Row Level Security</Link>.
      </p>
    </>
  ),
};
