import type { DocEntry } from '../registry';
import { CodeBlock } from '../code-block';

export const CheatSheetPage: DocEntry = {
  title: 'Client cheat sheet',
  description: 'One-page map of the voltbase-js surface.',
  toc: [{ id: 'surface', title: 'Surface' }],
  render: () => (
    <>
      <h2 id="surface">Surface</h2>
      <CodeBlock
        language="ts"
        code={`import { createClient } from 'voltbase-js';

const vb = createClient(projectUrl, apiKey);

// Database
vb.from('t').select('*').eq('id', id).order('c', 'desc').limit(10)
vb.from('t').insert({ … })
vb.from('t').eq('id', id).update({ … })
vb.from('t').eq('id', id).delete()
vb.rpc('fn', { arg: 1 })

// Auth
vb.auth.signUp / signIn / sendMagicLink
vb.auth.signInWithGoogle / signInWithGithub
vb.auth.resendVerification / resetPasswordForEmail / updatePassword
vb.auth.getSession / setSession / getUser / getAccessToken / signOut
vb.auth.onAuthStateChange(cb)

// Storage
vb.storage.listBuckets / createBucket / deleteBucket
vb.storage.from('b').list / upload / remove / getSignedUrl

// Realtime
vb.realtime.subscribe(table, cb, { event?, filter? })
vb.realtime.channel(topic).on(…).subscribe() / send / track`}
      />
    </>
  ),
};
