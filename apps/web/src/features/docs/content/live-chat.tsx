import type { DocEntry } from '../registry';
import { CodeBlock } from '../code-block';
import { Callout } from '../docs-ui';

export const LiveChatPage: DocEntry = {
  title: 'Live chat',
  description:
    'Messages table with realtime inserts and an optional presence channel.',
  toc: [
    { id: 'schema', title: '1. Schema' },
    { id: 'realtime', title: '2. Realtime' },
    { id: 'presence', title: '3. Presence' },
  ],
  render: () => (
    <>
      <h2 id="schema">1. Schema</h2>
      <CodeBlock
        language="sql"
        code={`CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room TEXT NOT NULL,
  author TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);`}
      />
      <p>
        Enable the table under dashboard <strong>Realtime</strong>.
      </p>

      <h2 id="realtime">2. Realtime</h2>
      <CodeBlock
        language="ts"
        code={`const admin = createClient(projectUrl, serviceRoleKey);

voltbase.realtime.subscribe(
  'messages',
  (event) => {
    if (event.type === 'INSERT') appendMessage(event.record);
  },
  { event: 'INSERT', filter: { room: 'lobby' } },
);

await admin.from('messages').insert({
  room: 'lobby',
  author: 'alice',
  body: 'Hello!',
});`}
      />

      <h2 id="presence">3. Presence</h2>
      <CodeBlock
        language="ts"
        code={`const channel = voltbase.realtime.channel('lobby');

channel
  .on('presence', { event: 'sync' }, ({ state }) => setOnline(state))
  .subscribe();

channel.track({ user: 'alice' });`}
      />
      <Callout variant="warn">
        Presence is in-memory on a single API instance — fine for demos and
        single-replica deploys.
      </Callout>
    </>
  ),
};
