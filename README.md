# Voltbase

Backend-as-a-service monorepo: NestJS API, Next.js dashboard, shared packages, and the `voltbase-js` client SDK.

## Apps

| Package | Description |
|---------|-------------|
| `apps/api` | NestJS API (auth, orgs, projects, SQL, storage, realtime) |
| `apps/web` | Next.js dashboard |
| `packages/constants` | Shared constants (`@voltbase/constants`) |
| `packages/types` | Shared TypeScript types (`@voltbase/types`) |
| `packages/voltbase-js` | Official JS/TS SDK ([npm](https://www.npmjs.com/package/voltbase-js)) |

## Develop

```bash
pnpm install
pnpm run dev
```

- API: `http://localhost:3000/api`
- Web: `http://localhost:3001`

Copy `apps/api/.env` and `apps/web/.env` from your local secrets (not committed).
