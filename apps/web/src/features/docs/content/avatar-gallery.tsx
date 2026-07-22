import type { DocEntry } from '../registry';
import { CodeBlock } from '../code-block';
import { Callout } from '../docs-ui';

export const AvatarGalleryPage: DocEntry = {
  title: 'Avatar gallery',
  description: 'Create a public bucket, upload from the browser, list URLs.',
  toc: [
    { id: 'bucket', title: '1. Create bucket' },
    { id: 'upload', title: '2. Upload & list' },
  ],
  render: () => (
    <>
      <h2 id="bucket">1. Create bucket</h2>
      <Callout variant="tip">
        Bucket create/delete needs the <strong>service role</strong> key —
        typically a one-time server or dashboard action.
      </Callout>
      <CodeBlock
        language="ts"
        code={`const admin = createClient(projectUrl, serviceRoleKey);

await admin.storage.createBucket('avatars', { public: true });`}
      />
      <p>
        Or create the bucket in the dashboard Storage UI, then use the anon key
        in the browser for uploads (depending on your UploadThing / project
        storage auth setup).
      </p>

      <h2 id="upload">2. Upload &amp; list</h2>
      <CodeBlock
        language="ts"
        code={`const voltbase = createClient(projectUrl, anonKey);
const bucket = voltbase.storage.from('avatars');

const input = document.querySelector<HTMLInputElement>('input[type=file]')!;
const file = input.files![0]!;

const { data: uploaded, error } = await bucket.upload(file);
const { data: files } = await bucket.list();

// Public buckets expose url on the object; private use getSignedUrl
const { data: signed } = await bucket.getSignedUrl(uploaded!.id);`}
      />
    </>
  ),
};
