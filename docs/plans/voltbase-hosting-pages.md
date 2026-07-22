---
name: Voltbase Hosting Pages
status: implemented
overview: Vercel-style Hosting — butter-smooth repo→live deploy in the Voltbase dashboard, Cloudflare Pages (free) for CDN via Direct Upload after Nest build, auto Voltbase env injection.
---

# Voltbase Hosting (Cloudflare Pages)

Canonical implementation plan (see also Cursor plan `voltbase_hosting_pages_de291f62`).

When the user says **hosting**, **deploy**, or **Vercel-style deploy**, use this doc + the codebase under `apps/api/src/hosting` and `apps/web/src/features/hosting`.

## Locked decisions

- Compute/CDN: Cloudflare Pages Free (Direct Upload)
- Control plane: Nest builds from GitHub tarball then uploads assets
- Auth for repos: GitHub OAuth (user token)
- Soft cap: 95 CF Pages projects
- Next SSR: not on Free — static export only

## Env

```
CF_ACCOUNT_ID=
CF_API_TOKEN=
HOSTING_ROOT_DOMAIN=apps.voltbase.dev
HOSTING_GITHUB_CLIENT_ID=
HOSTING_GITHUB_CLIENT_SECRET=
HOSTING_GITHUB_CALLBACK_URL=
```

## Key paths

- API: `apps/api/src/hosting/`
- UI: `apps/web/src/features/hosting/`
- Docs: `/docs/hosting`
- Migration: `apps/api/drizzle/0008_hosting.sql`
