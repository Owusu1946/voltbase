import type { DocEntry } from '../registry';
import { CodeBlock } from '../code-block';

export const RestNestedRpcPage: DocEntry = {
  title: 'Nested select & RPC',
  description: 'Embed related rows and call Postgres functions.',
  toc: [
    { id: 'nested', title: 'Nested select' },
    { id: 'rpc', title: 'RPC' },
  ],
  render: () => (
    <>
      <h2 id="nested">Nested select</h2>
      <p>One level of embedding via foreign keys:</p>
      <CodeBlock
        language="bash"
        code={`curl "$PROJECT_URL/rest/posts?select=id,title,author:users(id,email)" \\
  -H "Authorization: Bearer $ANON_KEY"`}
      />

      <h2 id="rpc">RPC</h2>
      <CodeBlock
        language="bash"
        code={`curl -X POST "$PROJECT_URL/rest/rpc/get_user_stats" \\
  -H "Authorization: Bearer $ANON_KEY" \\
  -H "Content-Type: application/json" \\
  -H "X-User-Jwt: $USER_ACCESS_TOKEN" \\
  -d '{"user_id":"…"}'`}
      />
      <p>
        Functions must exist in the project schema. Grant execute to{' '}
        <code>anon</code> / <code>authenticated</code> roles as needed (defaults
        are applied on new projects).
      </p>
    </>
  ),
};
