import type { DocEntry } from '../registry';
import { CodeBlock } from '../code-block';
import { Callout } from '../docs-ui';

export const AuthPage: DocEntry = {
  title: 'Auth',
  description:
    'Email/password, magic link, OAuth, verification, password reset, and session persistence.',
  toc: [
    { id: 'email', title: 'Email & password' },
    { id: 'magic', title: 'Magic link' },
    { id: 'oauth', title: 'OAuth' },
    { id: 'verify-reset', title: 'Verify & reset' },
    { id: 'session', title: 'Session' },
  ],
  render: () => (
    <>
      <h2 id="email">Email &amp; password</h2>
      <CodeBlock
        language="ts"
        code={`const { data, error } = await voltbase.auth.signUp({
  email: 'you@example.com',
  password: 'secret',
});

const { data: session, error: signInError } = await voltbase.auth.signIn({
  email: 'you@example.com',
  password: 'secret',
});`}
      />
      <Callout title="Soft email verification">
        Signup returns a session immediately and emails a verify link. Sign-in
        works before verify; check <code>email_verified</code> in the dashboard
        users list.
      </Callout>

      <h2 id="magic">Magic link</h2>
      <CodeBlock
        language="ts"
        code={`await voltbase.auth.sendMagicLink('you@example.com');
// User opens email → redirects to siteUrl?access_token=…`}
      />

      <h2 id="oauth">OAuth</h2>
      <p>
        Configure Google/GitHub in the dashboard Auth → Providers, set Site URL,
        then:
      </p>
      <CodeBlock
        language="ts"
        code={`voltbase.auth.signInWithGoogle();
voltbase.auth.signInWithGithub();`}
      />

      <h2 id="verify-reset">Verify &amp; reset</h2>
      <CodeBlock
        language="ts"
        code={`await voltbase.auth.resendVerification('you@example.com');

await voltbase.auth.resetPasswordForEmail('you@example.com');
// Email lands on siteUrl?type=recovery&token=…
await voltbase.auth.updatePassword({
  token: '…',
  password: 'new-secret',
});`}
      />

      <h2 id="session">Session</h2>
      <CodeBlock
        language="ts"
        code={`voltbase.auth.getSession();
voltbase.auth.setSession({ accessToken });
voltbase.auth.getAccessToken();
voltbase.auth.getUser();
voltbase.auth.signOut();

const unsubscribe = voltbase.auth.onAuthStateChange((event, session) => {
  console.log(event, session);
});`}
      />
      <p>
        Sessions persist in <code>localStorage</code> (
        <code>voltbase.auth.token</code>). OAuth/magic redirects with{' '}
        <code>?access_token=</code> hydrate automatically.
      </p>
      <Callout variant="warn" title="No refresh tokens yet">
        Project-auth JWTs last 7 days. After expiry the user must sign in again.
      </Callout>
    </>
  ),
};
