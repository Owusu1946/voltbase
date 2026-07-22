import type { DocEntry } from '../registry';
import { CodeBlock } from '../code-block';
import { Callout } from '../docs-ui';

export const StoragePage: DocEntry = {
  title: 'Storage',
  description: 'Buckets, uploads, signed URLs, and object listing.',
  toc: [
    { id: 'buckets', title: 'Buckets' },
    { id: 'objects', title: 'Objects' },
  ],
  render: () => (
    <>
      <h2 id="buckets">Buckets</h2>
      <Callout variant="tip">
        Creating or deleting buckets requires the <strong>service role</strong>{' '}
        key. Listing works with any project key.
      </Callout>
      <CodeBlock
        language="ts"
        code={`const { data: buckets } = await voltbase.storage.listBuckets();

await voltbase.storage.createBucket('avatars', { public: true });
await voltbase.storage.deleteBucket('avatars');`}
      />

      <h2 id="objects">Objects</h2>
      <CodeBlock
        language="ts"
        code={`const bucket = voltbase.storage.from('avatars');

const { data: files } = await bucket.list();

const { data: uploaded, error } = await bucket.upload(file); // File from <input>

const { data: signed } = await bucket.getSignedUrl(objectId);
// signed.url

await bucket.remove(objectId);`}
      />
    </>
  ),
};
