import type { DocEntry } from '../registry';
import { CodeBlock } from '../code-block';
import { Callout } from '../docs-ui';

export const DatabasePage: DocEntry = {
  title: 'Database',
  description:
    'Query tables with a fluent builder. Filters, nested selects, and RPC.',
  toc: [
    { id: 'select', title: 'Select' },
    { id: 'filters', title: 'Filters' },
    { id: 'nested', title: 'Nested select' },
    { id: 'mutate', title: 'Insert / update / delete' },
    { id: 'rpc', title: 'RPC' },
  ],
  render: () => (
    <>
      <h2 id="select">Select</h2>
      <p>
        All queries return <code>{`{ data, error }`}</code>. Builders are
        thenable — you can <code>await</code> them directly.
      </p>
      <CodeBlock
        language="ts"
        code={`const { data, error } = await voltbase
  .from('products')
  .select('id, name, price')
  .eq('active', true)
  .order('created_at', 'desc')
  .limit(10);`}
      />

      <h2 id="filters">Filters</h2>
      <table>
        <thead>
          <tr>
            <th>Method</th>
            <th>Example</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <code>.eq</code> / <code>.neq</code>
            </td>
            <td>
              <code>.eq(&apos;id&apos;, &apos;…&apos;)</code>
            </td>
          </tr>
          <tr>
            <td>
              <code>.gt</code> / <code>.gte</code> / <code>.lt</code> /{' '}
              <code>.lte</code>
            </td>
            <td>
              <code>.gte(&apos;price&apos;, 10)</code>
            </td>
          </tr>
          <tr>
            <td>
              <code>.like</code> / <code>.ilike</code>
            </td>
            <td>
              <code>.ilike(&apos;name&apos;, &apos;%phone%&apos;)</code>
            </td>
          </tr>
          <tr>
            <td>
              <code>.is</code>
            </td>
            <td>
              <code>.is(&apos;deleted_at&apos;, &apos;null&apos;)</code>
            </td>
          </tr>
        </tbody>
      </table>

      <h2 id="nested">Nested select</h2>
      <p>
        One-level embeds over foreign keys — commas inside <code>(…)</code> are
        preserved:
      </p>
      <CodeBlock
        language="ts"
        code={`const { data } = await voltbase
  .from('posts')
  .select('id, title, author:users(id, email)');`}
      />

      <h2 id="mutate">Insert / update / delete</h2>
      <CodeBlock
        language="ts"
        code={`await voltbase.from('products').insert({ name: 'Keyboard', price: 99 });

await voltbase
  .from('products')
  .eq('id', productId)
  .update({ price: 79 });

await voltbase.from('products').eq('id', productId).delete();`}
      />
      <Callout variant="tip" title="Updates & deletes">
        The SDK currently targets rows with <code>.eq(&apos;id&apos;, …)</code>{' '}
        for update/delete. Prefer service role or authenticated JWT + RLS for
        writes.
      </Callout>

      <h2 id="rpc">RPC</h2>
      <CodeBlock
        language="ts"
        code={`const { data, error } = await voltbase.rpc('get_user_stats', {
  user_id: '…',
});`}
      />
      <p>
        When a session exists, REST/RPC requests automatically send{' '}
        <code>X-User-Jwt</code> so RLS can use <code>uid()</code>.
      </p>
    </>
  ),
};
