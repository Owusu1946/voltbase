import Link from 'next/link';
import type { DocEntry } from '../registry';
import { CodeBlock } from '../code-block';
import { Callout } from '../docs-ui';
import {
  FrameworkCode,
  FrameworkProvider,
  FrameworkTabs,
} from '../framework-switcher';
import { todoClientSnippets } from './example-snippets-todo';

export const TodoRlsPage: DocEntry = {
  title: 'Todo + RLS',
  description:
    'A minimal todo app where each user only sees their own rows.',
  toc: [
    { id: 'schema', title: '1. Schema' },
    { id: 'policies', title: '2. Policies' },
    { id: 'client', title: '3. Client' },
  ],
  render: () => (
    <FrameworkProvider>
      <Callout title="What you'll build">
        Sign up → create todos scoped to <code>uid()</code> → list only your
        rows using the anon key + session.
      </Callout>

      <h2 id="schema">1. Schema</h2>
      <p>Run in SQL editor or Migrations:</p>
      <CodeBlock
        language="sql"
        filename="schema.sql"
        code={`CREATE TABLE todos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  done BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX todos_user_id_idx ON todos (user_id);`}
      />

      <h2 id="policies">2. Policies</h2>
      <CodeBlock
        language="sql"
        filename="policies.sql"
        code={`ALTER TABLE todos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users manage own todos"
  ON todos
  FOR ALL
  TO authenticated
  USING (uid() = user_id)
  WITH CHECK (uid() = user_id);`}
      />
      <p>
        Or use the table editor → Policies tab (roles:{' '}
        <code>authenticated</code>, using/with check:{' '}
        <code>uid() = user_id</code>).
      </p>

      <h2 id="client">3. Client</h2>
      <p>Pick your framework — selection is remembered across examples.</p>
      <FrameworkTabs />
      <FrameworkCode snippets={todoClientSnippets} />
      <Callout variant="tip">
        Need env + client setup first? See the matching{' '}
        <Link href="/docs/frameworks">framework quickstart</Link>.
      </Callout>
    </FrameworkProvider>
  ),
};
