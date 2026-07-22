import type { DocEntry } from '../registry';
import { CodeBlock } from '../code-block';
import { Callout } from '../docs-ui';

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
    <>
      <Callout title="What you'll build">
        Sign up → create todos scoped to <code>uid()</code> → list only your
        rows using the anon key + session.
      </Callout>

      <h2 id="schema">1. Schema</h2>
      <p>Run in SQL editor or Migrations:</p>
      <CodeBlock
        language="sql"
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
      <CodeBlock
        language="ts"
        code={`import { createClient } from 'voltbase-js';

const voltbase = createClient(projectUrl, anonKey);

await voltbase.auth.signUp({ email, password });
const user = voltbase.auth.getUser();

await voltbase.from('todos').insert({
  user_id: user!.id,
  title: 'Ship docs',
});

const { data } = await voltbase
  .from('todos')
  .select('*')
  .order('created_at', 'desc');
// Only this user's rows — X-User-Jwt is sent automatically`}
      />
    </>
  ),
};
