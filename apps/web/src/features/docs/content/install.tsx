import type { DocEntry } from '../registry';
import { CodeBlock } from '../code-block';

export const InstallPage: DocEntry = {
  title: 'Install',
  description: 'Add voltbase-js to a browser or Node app.',
  toc: [
    { id: 'npm', title: 'npm / pnpm / yarn' },
    { id: 'create-client', title: 'createClient' },
    { id: 'surface', title: 'Client surface' },
  ],
  render: () => (
    <>
      <h2 id="npm">npm / pnpm / yarn</h2>
      <CodeBlock language="bash" code={`npm install voltbase-js`} />
      <CodeBlock language="bash" code={`pnpm add voltbase-js`} />
      <CodeBlock language="bash" code={`yarn add voltbase-js`} />

      <h2 id="create-client">createClient</h2>
      <CodeBlock
        language="ts"
        code={`import { createClient } from 'voltbase-js';

const voltbase = createClient(projectUrl, apiKey);`}
      />
      <p>
        <code>projectUrl</code> is the Project URL from the dashboard API page
        (includes <code>/api/projects/…</code>). <code>apiKey</code> is either
        the anon or service role JWT.
      </p>

      <h2 id="surface">Client surface</h2>
      <CodeBlock
        language="ts"
        code={`createClient(projectUrl, apiKey) → VoltbaseClient

client.from(table)      // same as client.db.from(table)
client.rpc(fn, args?)   // POST /rest/rpc/:fn
client.db
client.auth
client.storage
client.realtime`}
      />
    </>
  ),
};
