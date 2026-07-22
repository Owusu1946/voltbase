import type { DocEntry } from '../registry';
import { CodeBlock } from '../code-block';
import { Callout } from '../docs-ui';
import {
  FrameworkCode,
  FrameworkProvider,
  FrameworkTabs,
} from '../framework-switcher';
import {
  chatPresenceSnippets,
  chatRealtimeSnippets,
} from './example-snippets-chat';

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
    <FrameworkProvider>
      <h2 id="schema">1. Schema</h2>
      <CodeBlock
        language="sql"
        filename="schema.sql"
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
      <p>Pick your framework — selection is remembered across examples.</p>
      <FrameworkTabs />
      <FrameworkCode snippets={chatRealtimeSnippets} />

      <h2 id="presence">3. Presence</h2>
      <FrameworkCode snippets={chatPresenceSnippets} />
      <Callout variant="warn">
        Presence is in-memory on a single API instance — fine for demos and
        single-replica deploys.
      </Callout>
    </FrameworkProvider>
  ),
};
