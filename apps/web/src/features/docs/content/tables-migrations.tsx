import type { DocEntry } from '../registry';
import { CodeBlock } from '../code-block';
import { Callout } from '../docs-ui';

export const TablesMigrationsPage: DocEntry = {
  title: 'Tables & migrations',
  description:
    'Manage schema from the table editor, SQL editor, or versioned migrations.',
  toc: [
    { id: 'table-editor', title: 'Table editor' },
    { id: 'sql', title: 'SQL editor' },
    { id: 'migrations', title: 'Migrations' },
  ],
  render: () => (
    <>
      <h2 id="table-editor">Table editor</h2>
      <p>
        Create tables and columns visually. Use the schema panel under a table
        for <strong>indexes</strong>, <strong>foreign keys</strong>,{' '}
        <strong>unique</strong> constraints, and <strong>RLS policies</strong>.
      </p>

      <h2 id="sql">SQL editor</h2>
      <p>
        Run a single statement against your project schema. History keeps the
        last successful queries. Blocked: <code>DROP DATABASE</code>,{' '}
        <code>DROP SCHEMA</code>, <code>TRUNCATE</code>.
      </p>

      <h2 id="migrations">Migrations</h2>
      <p>
        Dashboard → <strong>Migrations</strong>: name a change, paste SQL,
        apply. Voltbase stores version, checksum, and history. Failed applies do
        not bump the version.
      </p>
      <CodeBlock
        language="sql"
        code={`CREATE TABLE notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);`}
      />
      <Callout variant="tip">
        Prefer migrations for anything you want reproducible across staging and
        production.
      </Callout>
    </>
  ),
};
