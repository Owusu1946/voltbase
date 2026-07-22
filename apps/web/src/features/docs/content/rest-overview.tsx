import type { DocEntry } from '../registry';
import { CodeBlock } from '../code-block';
import { Callout } from '../docs-ui';

export const RestOverviewPage: DocEntry = {
  title: 'REST overview',
  description: 'Instant REST endpoints for every project table.',
  toc: [
    { id: 'base', title: 'Base URL' },
    { id: 'auth', title: 'Authentication' },
  ],
  render: () => (
    <>
      <h2 id="base">Base URL</h2>
      <p>All REST routes live under your Project URL:</p>
      <CodeBlock
        language="text"
        code={`https://YOUR_API/api/projects/YOUR_SLUG/rest/...`}
      />

      <h2 id="auth">Authentication</h2>
      <ul>
        <li>
          <code>Authorization: Bearer &lt;anon|service_role key&gt;</code> —
          required
        </li>
        <li>
          <code>X-User-Jwt: &lt;project auth access token&gt;</code> — optional;
          runs as authenticated role for RLS
        </li>
      </ul>
      <Callout title="Service role bypasses RLS">
        The service role key runs as the database owner and ignores row
        policies. Use it on trusted servers only.
      </Callout>
      <p>
        The dashboard <strong>API</strong> page shows live curl examples for
        each of your tables.
      </p>
    </>
  ),
};
