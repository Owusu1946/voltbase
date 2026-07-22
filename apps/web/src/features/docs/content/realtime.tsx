import type { DocEntry } from '../registry';
import { CodeBlock } from '../code-block';
import { Callout } from '../docs-ui';

export const RealtimePage: DocEntry = {
  title: 'Realtime',
  description:
    'Subscribe to table changes, filter events, and use broadcast / presence channels.',
  toc: [
    { id: 'cdc', title: 'Table changes' },
    { id: 'filters', title: 'Filters' },
    { id: 'channels', title: 'Broadcast & presence' },
  ],
  render: () => (
    <>
      <h2 id="cdc">Table changes</h2>
      <p>
        Enable realtime for a table in the dashboard Realtime page (installs a
        Postgres trigger), then subscribe with the anon key:
      </p>
      <CodeBlock
        language="ts"
        code={`const unsubscribe = voltbase.realtime.subscribe('products', (event) => {
  console.log(event.type, event.table, event.record);
});

unsubscribe();
// or
voltbase.realtime.unsubscribe('products');
voltbase.realtime.disconnect();`}
      />

      <h2 id="filters">Filters</h2>
      <CodeBlock
        language="ts"
        code={`voltbase.realtime.subscribe(
  'products',
  (event) => console.log(event.record),
  { event: 'INSERT', filter: { status: 'active' } },
);`}
      />

      <h2 id="channels">Broadcast &amp; presence</h2>
      <CodeBlock
        language="ts"
        code={`const channel = voltbase.realtime.channel('room-1');

channel
  .on('broadcast', { event: 'cursor' }, ({ payload }) => {
    console.log('cursor', payload);
  })
  .on('presence', { event: 'sync' }, ({ state }) => {
    console.log('online', state);
  })
  .subscribe();

channel.send({ type: 'broadcast', event: 'cursor', payload: { x: 1, y: 2 } });
channel.track({ user: 'alice' });
channel.untrack();
channel.unsubscribe();`}
      />
      <Callout variant="warn" title="Presence is single-instance">
        Presence state lives in memory on one API process. It does not sync
        across multiple Railway replicas — use one instance (or add Redis later)
        for shared presence.
      </Callout>
    </>
  ),
};
