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

Copy env templates:

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
```

## Deploy

Order: **Railway (API) first**, then **Vercel (web)**, then update both with the final URLs.

### 1. Railway — API

1. [railway.app](https://railway.app) → New Project → Deploy from GitHub → `Owusu1946/voltbase`
2. Railway uses root [`railway.toml`](railway.toml):
   - Build: `pnpm run build:api`
   - Start: `pnpm run start:api`
   - Health: `GET /api/health`
3. Variables → add everything from [`apps/api/.env.example`](apps/api/.env.example)
4. Set placeholders first, then after you have URLs:
   - `WEB_URL` = `https://YOUR-APP.vercel.app` (no trailing slash)
   - `API_URL` = `https://YOUR-RAILWAY-DOMAIN/api`
   - OAuth callback URLs to the same Railway host
5. Generate a public domain under Settings → Networking

### 2. Vercel — Web

1. [vercel.com](https://vercel.com) → Add New Project → import `Owusu1946/voltbase`
2. **Root Directory:** `apps/web` (Important)
3. Framework: Next.js — [`apps/web/vercel.json`](apps/web/vercel.json) sets install/build for the monorepo
4. Environment variables from [`apps/web/.env.example`](apps/web/.env.example):
   - `API_URL` / `NEXT_PUBLIC_API_URL` = `https://YOUR-RAILWAY-DOMAIN/api`
   - `NEXT_PUBLIC_WEB_URL` = your Vercel URL
   - `JWT_ACCESS_SECRET` = **same value** as on Railway
5. Deploy

### 3. Wire URLs together

1. Put the Vercel URL into Railway `WEB_URL` (CORS + OAuth redirects)
2. Confirm Railway `API_URL` and OAuth callbacks match the Railway public domain
3. Redeploy both if you changed env vars after the first deploy

### Checklist

- [ ] Neon `DATABASE_URL` (+ `REALTIME_DATABASE_URL` if separate)
- [ ] Strong JWT / invite secrets (not the local defaults)
- [ ] Resend + UploadThing tokens for email/storage
- [ ] GitHub/Google OAuth app callback URLs point at Railway
- [ ] `WEB_URL` and Vercel URL match exactly (scheme + host, no trailing slash)
