# voltbase-js

Official JavaScript/TypeScript SDK for [Voltbase](https://www.npmjs.com/package/voltbase-js).

Query your project database, handle auth, upload files, and subscribe to realtime table changes from the browser or Node.

## Install

```bash
npm install voltbase-js
```

## Quick start

Get your **Project URL** and **API key** from the Voltbase dashboard (API docs page).

```ts
import { createClient } from 'voltbase-js';

const voltbase = createClient(
  'https://api.example.com/api/projects/your-project-slug',
  'your-anon-or-service-role-key',
);
```

| Key | Use for |
|-----|---------|
| Anon | Reads, realtime |
| Service role | Writes (insert / update / delete), storage mutations |

---

## Database

All queries return `{ data, error }`. You can `await` a builder directly (it is thenable) or call `.execute()`.

### Select

```ts
const { data, error } = await voltbase
  .from('products')
  .select('id, name, price')
  .eq('active', true)
  .order('created_at', 'desc')
  .limit(10);
```

### Nested select (embeds)

Pass the select string as-is — commas inside `(…)` are preserved:

```ts
const { data } = await voltbase
  .from('posts')
  .select('id, title, author:users(id, email)');
```

### Filters

| Method | Example |
|--------|---------|
| `.eq(col, value)` | `.eq('id', '…')` |
| `.neq(col, value)` | `.neq('status', 'draft')` |
| `.gt` / `.gte` / `.lt` / `.lte` | `.gte('price', 10)` |
| `.like` / `.ilike` | `.ilike('name', '%phone%')` |
| `.is(col, 'null' \| 'not null')` | `.is('deleted_at', 'null')` |

Also: `.order(col, 'asc' \| 'desc')`, `.limit(n)`, `.offset(n)`.

### Insert

```ts
const { data, error } = await voltbase.from('products').insert({
  name: 'Keyboard',
  price: 99,
});
```

### Update / delete

Updates and deletes require `.eq('id', rowId)`:

```ts
await voltbase
  .from('products')
  .eq('id', productId)
  .update({ price: 79 });

await voltbase.from('products').eq('id', productId).delete();
```

### Typed rows

```ts
type Product = { id: string; name: string; price: number };

const { data } = await voltbase.from<Product>('products').select('*');
```

### RPC

Call a Postgres function exposed via the project REST API:

```ts
const { data, error } = await voltbase.rpc('get_user_stats', {
  user_id: '…',
});
```

When a user session exists, REST and RPC requests automatically include the `X-User-Jwt` header so RLS can use `auth.uid()`.

---

## Auth

```ts
// Email + password
const { data, error } = await voltbase.auth.signUp({
  email: 'you@example.com',
  password: 'secret',
});

const { data: session, error: signInError } = await voltbase.auth.signIn({
  email: 'you@example.com',
  password: 'secret',
});

// Magic link
await voltbase.auth.sendMagicLink('you@example.com');

// Email verification (soft — sign-in works before verify)
await voltbase.auth.resendVerification('you@example.com');

// Password reset
await voltbase.auth.resetPasswordForEmail('you@example.com');
await voltbase.auth.updatePassword({ token: '…', password: 'new-secret' });

// OAuth (browser redirect)
voltbase.auth.signInWithGoogle();
voltbase.auth.signInWithGithub();

// Session helpers
voltbase.auth.getSession(); // { accessToken, user } | null
voltbase.auth.setSession({ accessToken });
voltbase.auth.getAccessToken(); // string | null
voltbase.auth.getUser(); // { id, email } | null
voltbase.auth.signOut();

// Listen for sign-in / sign-out / initial hydrate
const unsubscribe = voltbase.auth.onAuthStateChange((event, session) => {
  console.log(event, session);
});
```

Sessions persist in `localStorage` (`voltbase.auth.token`) and hydrate on construct.
OAuth / magic-link redirects that land with `?access_token=…` are picked up automatically.
Signup verification redirects with `?type=signup`; password-reset emails land with `?type=recovery&token=…`.

**Limitation:** there is no refresh-token flow yet. Project-auth JWTs last 7 days; after expiry the user must sign in again.

---

## Storage

Bucket management requires the **service role** key (`createBucket` / `deleteBucket`). Listing works with any project key.

```ts
const { data: buckets } = await voltbase.storage.listBuckets();

await voltbase.storage.createBucket('avatars', { public: true });
await voltbase.storage.deleteBucket('avatars');

const bucket = voltbase.storage.from('avatars');

const { data: files } = await bucket.list();

const { data: uploaded, error } = await bucket.upload(file); // File from <input>

const { data: signed } = await bucket.getSignedUrl(objectId);
// signed.url

await bucket.remove(objectId);
```

---

## Realtime

Subscribe to table changes (INSERT / UPDATE / DELETE). Use a key that can read the table.

```ts
const unsubscribe = voltbase.realtime.subscribe('products', (event) => {
  console.log(event.type, event.table, event.record);
});

// Optional: event type + equality filters (server-side)
voltbase.realtime.subscribe(
  'products',
  (event) => console.log(event.record),
  { event: 'INSERT', filter: { status: 'active' } },
);

unsubscribe();
voltbase.realtime.unsubscribe('products');
voltbase.realtime.disconnect();
```

### Channels: broadcast & presence

```ts
const channel = voltbase.realtime.channel('room-1');

channel
  .on('broadcast', { event: 'cursor' }, ({ payload }) => {
    console.log('cursor', payload);
  })
  .on('presence', { event: 'sync' }, ({ state }) => {
    console.log('online', state);
  })
  .subscribe();

channel.send({ type: 'broadcast', event: 'cursor', payload: { x: 1, y: 2 } });
channel.track({ user: 'alice' });
channel.untrack();
channel.unsubscribe();
```

**Presence is in-memory on a single API instance.** It does not sync across multiple Railway/replicas — use one realtime instance (or add Redis later) if you need shared presence.

---

## Client surface

```ts
createClient(projectUrl, apiKey) → VoltbaseClient

client.from(table)      // same as client.db.from(table)
client.rpc(fn, args?)   // POST /rest/rpc/:fn
client.db
client.auth
client.storage
client.realtime
```

## License

ISC
