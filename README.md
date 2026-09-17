# The Weekly Edit

Web platform for per-creator weekly content planning. Each girl gets a private, passcode-locked page that refreshes weekly with a 7-day close-friends story schedule, real "steal this format" examples from creators in her niche, reel ideas, and current Instagram features — all matched to her lane.

**Production:** https://weekly-edit-altr5.vercel.app (Vercel project `weekly-edit`, team `altr5`)

- Girls' pages: `/g/<slug>` (passcode she was given)
- Manager admin: `/admin` (team password)

## Scope (unchanged)

This platform plans **genuine lifestyle content** for the roster. It does not include outreach/DM tooling, scraping of individuals, or content engineered to disguise a pitch. Every girl's page carries the standing rule: when a conversation turns commercial, the agency relationship gets disclosed. Reviewing our own clients' public profiles to place them in a niche is in scope; profiling third parties is not.

## Stack

- Next.js 15 (App Router) on Vercel
- Postgres via `DATABASE_URL` (Neon on Vercel). Without it, the app falls back to embedded Postgres (PGlite): persistent in `.data/` locally, **ephemeral on Vercel** — the admin panel shows a warning banner until Neon is connected.
- Auth: HMAC-signed cookies. Admin password from `ADMIN_PASSWORD` env; creator passcodes scrypt-hashed in the DB.

## Data model

- `creators` — roster (slug, name, IG handle, email, gmail, passcode hash, niche, notes, goals). Seeded with `creators/demo-girl.json` (passcode `peach123`) when empty — delete her from `/admin` once real girls are in.
- `examples` — "steal this format" links: real posts from female creators per niche, shown newest-first on matching girls' pages. Managed in `/admin`, fed by the weekly refresh.
- The idea library and niche taxonomy stay in git as source-of-truth JSON: `data/content-library.json`, `data/niches.json`, `data/weekly/*.json` (+ `data/weekly/index.ts` manifest).

## Onboarding a new girl

1. `/admin` → *Add a girl*: name, IG handle, passcode (+ email/gmail).
2. Ask Claude to review her public profile and set her niche, secondary niche, and aesthetic notes.
3. Send her `https://weekly-edit-altr5.vercel.app/g/<slug>` and the passcode — in separate messages.

## Weekly refresh

See `WEEKLY.md`. Short version: Claude researches fresh formats → writes `data/weekly/<YYYY-WW>.json` + registers it in `data/weekly/index.ts` → adds real example links via `/admin` (or the API) → `vercel deploy --prod`.

## Local dev

```sh
npm install
ADMIN_PASSWORD=admin-dev npm run dev   # http://localhost:3000, data persists in .data/
```

## Deploy

```sh
vercel deploy --prod --yes
```

Env (already set in production): `ADMIN_PASSWORD`, `AUTH_SECRET`. Connect Neon (Storage tab or `vercel integration add neon`) to set `DATABASE_URL` and make the database permanent.
