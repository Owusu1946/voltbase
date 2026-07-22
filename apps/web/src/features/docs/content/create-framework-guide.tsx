import Link from 'next/link';
import type { ReactNode } from 'react';
import type { DocEntry } from '../registry';
import { CodeBlock } from '../code-block';
import { Callout } from '../docs-ui';

export type FrameworkGuideConfig = {
  framework: string;
  title: string;
  description: string;
  createApp: {
    command: string;
    note?: ReactNode;
  };
  env: {
    filename: string;
    code: string;
    tip?: ReactNode;
  };
  client: {
    filename: string;
    language?: string;
    code: string;
  };
  query: {
    filename: string;
    language?: string;
    code: string;
    intro?: ReactNode;
  };
  nextSteps?: ReactNode;
};

export function createFrameworkGuide(
  config: FrameworkGuideConfig,
): DocEntry {
  const {
    framework,
    title,
    description,
    createApp,
    env,
    client,
    query,
    nextSteps,
  } = config;

  return {
    title,
    description,
    toc: [
      { id: 'project', title: '1. Create a Voltbase project' },
      { id: 'database', title: '2. Set up your database' },
      { id: 'app', title: `3. Create a ${framework} app` },
      { id: 'env', title: '4. Declare environment variables' },
      { id: 'client', title: '5. Create a Voltbase client' },
      { id: 'query', title: `6. Query Voltbase from ${framework}` },
    ],
    render: () => (
      <>
        <h2 id="project">1. Create a Voltbase project</h2>
        <ol>
          <li>
            <Link href="/register">Sign up</Link> or{' '}
            <Link href="/login">sign in</Link>
          </li>
          <li>Create an organization and a project</li>
          <li>
            Open <strong>API</strong> and copy the <strong>Project URL</strong>,{' '}
            <strong>anon key</strong>, and (for server-only writes) the{' '}
            <strong>service role key</strong>
          </li>
        </ol>
        <Callout variant="info">
          You can also create projects from the dashboard after signing in — no
          CLI required for this quickstart.
        </Callout>

        <h2 id="database">2. Set up your database</h2>
        <p>
          In the dashboard, open <strong>Database</strong> and create a{' '}
          <code>instruments</code> table (or run SQL):
        </p>
        <CodeBlock
          language="sql"
          filename="schema.sql"
          code={`create table instruments (
  id bigint generated always as identity primary key,
  name text not null
);

insert into instruments (name)
values ('violin'), ('viola'), ('cello');

alter table instruments enable row level security;

create policy "public read"
on instruments for select
to anon
using (true);`}
        />
        <Callout variant="tip" title="Why RLS?">
          With a public <code>SELECT</code> policy for <code>anon</code>, the
          browser anon key can read rows. Writes still need auth policies or the
          service role on the server.
        </Callout>

        <h2 id="app">3. Create a {framework} app</h2>
        <CodeBlock language="bash" code={createApp.command} />
        {createApp.note ? <p>{createApp.note}</p> : null}

        <h2 id="env">4. Declare environment variables</h2>
        <p>
          Create <code>{env.filename}</code> at the project root and paste your
          dashboard values:
        </p>
        <CodeBlock
          language="bash"
          filename={env.filename}
          code={env.code}
        />
        {env.tip ? <Callout variant="tip">{env.tip}</Callout> : null}
        <Callout variant="warn" title="Keep the service role server-only">
          Never put the service role key in client bundles. Use the anon key in
          the browser; use the service role only in server routes, Server
          Components, or backend jobs.
        </Callout>

        <h2 id="client">5. Create a Voltbase client</h2>
        <p>
          Install the SDK, then add a small helper:
        </p>
        <CodeBlock language="bash" code={`npm install voltbase-js`} />
        <CodeBlock
          language={client.language ?? 'ts'}
          filename={client.filename}
          code={client.code}
        />

        <h2 id="query">6. Query Voltbase from {framework}</h2>
        {query.intro ? <p>{query.intro}</p> : (
          <p>
            Fetch rows from <code>instruments</code> and render them:
          </p>
        )}
        <CodeBlock
          language={query.language ?? 'tsx'}
          filename={query.filename}
          code={query.code}
        />

        <p>
          {nextSteps ?? (
            <>
              Next:{' '}
              <Link href="/docs/javascript/auth">Auth</Link>,{' '}
              <Link href="/docs/javascript/realtime">Realtime</Link>, or the{' '}
              <Link href="/docs/examples/todo-rls">Todo + RLS</Link> example.
            </>
          )}
        </p>
      </>
    ),
  };
}
