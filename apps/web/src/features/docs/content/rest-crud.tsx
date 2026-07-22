import type { DocEntry } from '../registry';
import { CodeBlock } from '../code-block';

export const RestCrudPage: DocEntry = {
  title: 'CRUD & filters',
  description: 'Select, insert, update, and delete over HTTP.',
  toc: [
    { id: 'get', title: 'GET' },
    { id: 'post', title: 'POST' },
    { id: 'patch-delete', title: 'PATCH / DELETE' },
  ],
  render: () => (
    <>
      <h2 id="get">GET</h2>
      <CodeBlock
        language="bash"
        code={`curl "$PROJECT_URL/rest/products?limit=10&order=created_at.desc&active=eq.true" \\
  -H "Authorization: Bearer $ANON_KEY"`}
      />
      <p>
        Filter syntax: <code>column=op.value</code> where op is{' '}
        <code>eq|neq|gt|gte|lt|lte|like|ilike|is</code>.
      </p>

      <h2 id="post">POST</h2>
      <CodeBlock
        language="bash"
        code={`curl -X POST "$PROJECT_URL/rest/products" \\
  -H "Authorization: Bearer $SERVICE_ROLE_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"name":"Keyboard","price":99}'`}
      />

      <h2 id="patch-delete">PATCH / DELETE</h2>
      <CodeBlock
        language="bash"
        code={`curl -X PATCH "$PROJECT_URL/rest/products/$ID" \\
  -H "Authorization: Bearer $SERVICE_ROLE_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"price":79}'

curl -X DELETE "$PROJECT_URL/rest/products/$ID" \\
  -H "Authorization: Bearer $SERVICE_ROLE_KEY"`}
      />
    </>
  ),
};
