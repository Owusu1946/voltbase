import type { DocEntry } from '../registry';

export const LimitationsPage: DocEntry = {
  title: 'Limitations',
  description: 'Known constraints of the current Voltbase MVP.',
  toc: [{ id: 'list', title: 'Current limits' }],
  render: () => (
    <>
      <h2 id="list">Current limits</h2>
      <ul>
        <li>
          <strong>No refresh tokens</strong> for project auth — JWTs last ~7
          days
        </li>
        <li>
          <strong>Presence</strong> is in-memory / single API instance
        </li>
        <li>
          <strong>Nested select</strong> is one level deep
        </li>
        <li>
          <strong>SDK update/delete</strong> currently keyed by{' '}
          <code>.eq(&apos;id&apos;, …)</code>
        </li>
        <li>
          <strong>No hosted embedding API</strong> — generate vectors with
          OpenAI/HF/etc.; Voltbase stores and queries them via pgvector
        </li>
        <li>
          <strong>Storage RLS</strong> is not implemented yet — protect buckets
          with key choice and app logic
        </li>
      </ul>
    </>
  ),
};
