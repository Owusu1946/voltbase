import Link from 'next/link';
import type { DocEntry } from '../registry';
import { CodeBlock } from '../code-block';
import { Callout } from '../docs-ui';

export const QuickstartPage: DocEntry = {
  title: 'Quickstart',
  description:
    'Create a project, grab keys, install the SDK, and run your first select.',
  toc: [
    { id: 'create', title: '1. Create a project' },
    { id: 'keys', title: '2. Get your keys' },
    { id: 'install', title: '3. Install' },
    { id: 'query', title: '4. First query' },
    { id: 'write', title: '5. Write with service role' },
  ],
  render: () => (
    <>
      <h2 id="create">1. Create a project</h2>
      <ol>
        <li>
          <Link href="/register">Sign up</Link> or{' '}
          <Link href="/login">sign in</Link>
        </li>
        <li>Create an organization and a project</li>
        <li>
          Open <strong>Database</strong> and create a table (e.g.{' '}
          <code>products</code> with <code>id</code>, <code>name</code>,{' '}
          <code>price</code>)
        </li>
      </ol>

      <h2 id="keys">2. Get your keys</h2>
      <p>
        Open <strong>API</strong> in the project sidebar. Copy:
      </p>
      <ul>
        <li>
          <strong>Project URL</strong> — looks like{' '}
          <code>https://api…/api/projects/your-slug</code>
        </li>
        <li>
          <strong>Anon key</strong> — safe for browsers (reads + realtime;
          writes need RLS + user JWT or service role)
        </li>
        <li>
          <strong>Service role key</strong> — full access; server only
        </li>
      </ul>
      <Callout variant="warn" title="Never expose the service role key">
        Put it only in server environments. Rotate from the API page if it
        leaks.
      </Callout>

      <h2 id="install">3. Install</h2>
      <CodeBlock language="bash" code={`npm install voltbase-js`} />

      <h2 id="query">4. First query</h2>
      <CodeBlock
        language="ts"
        code={`import { createClient } from 'voltbase-js';

const voltbase = createClient(
  'https://YOUR_API/api/projects/YOUR_SLUG',
  'YOUR_ANON_KEY',
);

const { data, error } = await voltbase
  .from('products')
  .select('id, name, price')
  .order('created_at', 'desc')
  .limit(10);

console.log(data, error);`}
      />

      <h2 id="write">5. Write with service role</h2>
      <p>
        Inserts/updates/deletes with the anon key alone require an authenticated
        user JWT (after RLS policies). For server scripts, use the service role:
      </p>
      <CodeBlock
        language="ts"
        code={`const admin = createClient(projectUrl, 'YOUR_SERVICE_ROLE_KEY');

const { data, error } = await admin.from('products').insert({
  name: 'Keyboard',
  price: 99,
});`}
      />
      <p>
        Next: <Link href="/docs/javascript/auth">Auth</Link> or{' '}
        <Link href="/docs/examples/todo-rls">Todo + RLS example</Link>.
      </p>
    </>
  ),
};
