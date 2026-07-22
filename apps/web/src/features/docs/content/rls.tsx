import type { DocEntry } from '../registry';
import { CodeBlock } from '../code-block';
import { Callout } from '../docs-ui';

export const RlsPage: DocEntry = {
  title: 'Row Level Security',
  description: 'Enforce per-user access with Postgres policies and uid().',
  toc: [
    { id: 'enable', title: 'Enable RLS' },
    { id: 'uid', title: 'uid()' },
    { id: 'policy', title: 'Example policy' },
  ],
  render: () => (
    <>
      <h2 id="enable">Enable RLS</h2>
      <p>
        In the table editor schema panel → <strong>Policies</strong>, enable RLS
        (or run SQL). Voltbase provisions{' '}
        <code>{`{schema}_anon`}</code> and{' '}
        <code>{`{schema}_authenticated`}</code> roles per project.
      </p>

      <h2 id="uid">uid()</h2>
      <p>
        Each project schema exposes <code>uid()</code> reading{' '}
        <code>request.jwt.claim.sub</code>. The REST layer sets this when{' '}
        <code>X-User-Jwt</code> is present (the SDK sends it automatically after
        sign-in).
      </p>

      <h2 id="policy">Example policy</h2>
      <CodeBlock
        language="sql"
        code={`ALTER TABLE todos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own todos"
  ON todos
  FOR ALL
  TO authenticated
  USING (uid() = user_id)
  WITH CHECK (uid() = user_id);`}
      />
      <Callout title="Service role bypass">
        Requests with only the service role key (no user JWT) bypass RLS — same
        idea as Supabase.
      </Callout>
    </>
  ),
};
