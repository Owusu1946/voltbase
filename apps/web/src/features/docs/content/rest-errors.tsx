import type { DocEntry } from '../registry';
import { CodeBlock } from '../code-block';

export const RestErrorsPage: DocEntry = {
  title: 'Errors',
  description: 'Consistent JSON error shapes from the project API.',
  toc: [{ id: 'shape', title: 'Shape' }],
  render: () => (
    <>
      <h2 id="shape">Shape</h2>
      <p>4xx responses typically look like:</p>
      <CodeBlock
        language="json"
        code={`{
  "message": "Permission denied by row level security or grants",
  "code": "rls_violation",
  "details": null
}`}
      />
      <p>
        Common codes: <code>invalid_identifier</code>, <code>empty_body</code>,{' '}
        <code>embed_no_fk</code>, <code>rpc_not_found</code>,{' '}
        <code>rls_violation</code>, <code>write_forbidden</code>.
      </p>
    </>
  ),
};
