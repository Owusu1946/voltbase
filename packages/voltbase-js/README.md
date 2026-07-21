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

**Limitation:** there is no refresh-token flow yet. Project-auth JWTs last 7 days; after expiry the user must sign in again.

---

## Storage

```ts
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

// Later
unsubscribe();
// or
voltbase.realtime.unsubscribe('products');
voltbase.realtime.disconnect();
```

---

## Client surface

```ts
createClient(projectUrl, apiKey) → VoltbaseClient

client.from(table)      // same as client.db.from(table)
client.db
client.auth
client.storage
client.realtime
```

## License

ISC
