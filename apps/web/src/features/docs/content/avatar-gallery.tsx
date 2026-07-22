import type { DocEntry } from '../registry';
import { Callout } from '../docs-ui';
import {
  FrameworkCode,
  FrameworkProvider,
  FrameworkTabs,
} from '../framework-switcher';
import {
  avatarBucketSnippets,
  avatarUploadSnippets,
} from './example-snippets-avatar';

export const AvatarGalleryPage: DocEntry = {
  title: 'Avatar gallery',
  description: 'Create a public bucket, upload from the browser, list URLs.',
  toc: [
    { id: 'bucket', title: '1. Create bucket' },
    { id: 'upload', title: '2. Upload & list' },
  ],
  render: () => (
    <FrameworkProvider>
      <p>Pick your framework — selection is remembered across examples.</p>
      <FrameworkTabs />

      <h2 id="bucket">1. Create bucket</h2>
      <Callout variant="tip">
        Bucket create/delete needs the <strong>service role</strong> key —
        typically a one-time server or dashboard action.
      </Callout>
      <FrameworkCode snippets={avatarBucketSnippets} />
      <p>
        Or create the bucket in the dashboard Storage UI, then use the anon key
        in the client for uploads.
      </p>

      <h2 id="upload">2. Upload &amp; list</h2>
      <FrameworkCode snippets={avatarUploadSnippets} />
    </FrameworkProvider>
  ),
};
