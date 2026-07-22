import Link from 'next/link';
import type { DocEntry } from '../registry';
import { Callout } from '../docs-ui';

export const IntroductionPage: DocEntry = {
  title: 'Introduction',
  description:
    'Voltbase gives every project a Postgres database, auth, storage, realtime, and instant REST APIs — with a JavaScript SDK that feels familiar.',
  toc: [
    { id: 'what-you-get', title: 'What you get' },
    { id: 'how-it-fits', title: 'How it fits together' },
    { id: 'next-steps', title: 'Next steps' },
  ],
  render: () => (
    <>
      <h2 id="what-you-get">What you get</h2>
      <ul>
        <li>
          <strong>Postgres</strong> — isolated schema per project, SQL editor,
          table editor, versioned migrations
        </li>
        <li>
          <strong>Auth</strong> — email/password, magic link, Google/GitHub,
          verify + password reset
        </li>
        <li>
          <strong>Data APIs</strong> — auto REST for every table, nested
          selects, RPC
        </li>
        <li>
          <strong>Realtime</strong> — table CDC, filters, broadcast &amp;
          presence channels
        </li>
        <li>
          <strong>Storage</strong> — buckets and file uploads via UploadThing
        </li>
        <li>
          <strong>RLS</strong> — real Postgres row level security with{' '}
          <code>uid()</code>
        </li>
      </ul>

      <h2 id="how-it-fits">How it fits together</h2>
      <p>
        Create a project in the dashboard, copy your <strong>Project URL</strong>{' '}
        and <strong>anon</strong> or <strong>service_role</strong> key from the
        API page, then use <code>voltbase-js</code> in your app.
      </p>
      <Callout title="Keys stay in the dashboard">
        Public docs use placeholders. Your live keys live under Project →{' '}
        <strong>API</strong> after you sign in.
      </Callout>

      <h2 id="next-steps">Next steps</h2>
      <p>
        Follow the{' '}
        <Link href="/docs/getting-started/quickstart">Quickstart</Link> to make
        your first query in under five minutes.
      </p>
    </>
  ),
};
