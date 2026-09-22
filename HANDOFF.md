# The Weekly Edit — Handoff

One-pager for whoever is folding this into the main ALTR platform. Everything below is built, deployed, and in production use.

## What this is

A content-planning dashboard for ALTR's roster of female lifestyle creators, focused entirely on **Instagram close-friends stories**. Each girl gets a private link that opens a personalized weekly dashboard telling her exactly what to post each day — no login, no passcode, no app install.

- **Production:** https://weekly-edit-altr5.vercel.app (Vercel project `weekly-edit`, team `altr5`)
- **Manager admin:** `/admin` (password is the `ADMIN_PASSWORD` env var on Vercel — get it from Derrek, it is not in this repo)
- **Girl pages:** `/g/<16-hex-token>` — the link itself is the key (secret-link pattern). Tokens live in the `creators` table; the admin roster shows each girl's link with a copy button.

## Product decisions that matter (learned through iteration — don't regress these)

1. **Close friends ≠ main feed.** Every caption is written in flat "group chat" register ("dinner lol", "which one"), not influencer voice. The register rule is printed on every girl's page: if a post feels like it's performing, it belongs on the main story.
2. **1–2 posts per day**, mostly single photos with a sticker. Not a filming workload.
3. **Visual-first tasks.** Every idea renders as a 9:16 story mockup showing the *exact* caption/sticker placement (`cap_pos`: top / center / lower), with a dashed outline marking the spot. Girls copy the layout, not just the words.
4. **One day at a time.** The calendar opens on *today* with day tabs Mon–Sun; "mark posted" persists per device (localStorage) and drives day checkmarks + a weekly progress counter.
5. **No reels on girl dashboards** (removed by request Sep 2026). Reel ideas still exist in `data/content-library.json` under `reels`, unrendered.
6. **Scope boundary (non-negotiable):** this tool plans genuine lifestyle content the girls actually live and post themselves. No outreach/DM tooling, no scraping/profiling of third parties, and captions are templates the girl retypes in her own words. When a viewer conversation turns commercial, the agency relationship gets disclosed — that rule is baked into the Features tab copy. Keep it there.

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15 (App Router), TypeScript, no UI libs |
| Hosting | Vercel (`weekly-edit`, team `altr5`); deployment protection disabled in favor of in-app auth |
| Database | Neon Postgres via Vercel marketplace (resource `neon-cordovan-feather`, `DATABASE_URL` in all envs). Local dev falls back to embedded PGlite in `.data/` — no local Postgres needed |
| Auth | Admin: `ADMIN_PASSWORD` env + HMAC cookie (`AUTH_SECRET`). Girls: tokenized URLs, no auth |
| Branding | Dark charcoal + mint from altrmgmt.com (`#1d1d1b` / `#b6f2e5`), Bricolage Grotesque only, real logo at `public/altr-logo.png`. Gray text is banned — white/near-white only (legibility feedback, twice) |

## Data model

**Postgres (runtime state):**
- `creators` — slug (pk), name, ig_handle, email, gmail, token (unique, the URL key), niche, secondary_niche, aesthetic_notes, posting_notes, goals. Schema auto-creates/migrates on boot (`lib/db.ts`), seeds `creators/demo-girl.json` when empty.

**Git JSON (content, the real IP):**
- `data/niches.json` — 8-niche taxonomy (clean-girl, gym-girl, soft-luxury, girl-next-door, alt-edgy, glam-baddie, country-outdoors, wellness-itgirl): visual signals, content pillars, aesthetics, watchlist notes.
- `data/content-library.json` — ~55 story templates. Item shape: `{id, title, film, caption, emoji, sticker, sticker_text, cap_pos, format, pillar, time, niches[]}`. `film` = what to shoot; `caption` = group-chat-voice text; `cap_pos` = where it sits on the story; `niches: ["*"]` = universal.
- `data/weekly/YYYY-WW.json` + `data/weekly/index.ts` (manifest) — weekly-refresh additions, flagged "new this week" and surfaced first.

## How the plan is generated (`lib/plan.ts`)

Deterministic, no stored schedules: seed = `hash(slug + ISO week)` → seeded shuffle of the items matching her niches → 2 per day × 7 days, time-of-day ordered, fresh weekly items forced to the front. Same week + same girl = same plan; every week auto-rotates. If you port one thing to the platform, port this + the JSON content.

## Key files

```
app/g/[slug]/page.tsx          server: token lookup, plan build, serialization
app/g/[slug]/IssueDashboard.tsx client: day tabs, task cards, mockups, mark-posted
app/admin/*                    manager panel (roster CRUD, private links)
app/api/admin/*                login + creators upsert/delete (HMAC cookie guard)
lib/plan.ts                    plan builder (port this)
lib/db.ts                      pg/PGlite driver + schema + seed + token backfill
lib/auth.ts                    HMAC cookies, admin password check
data/*                         content library, niches, weekly refresh files
WEEKLY.md                      weekly refresh workflow (Claude-assisted)
```

## Operating it

- **Onboard a girl:** `/admin` → add name + IG handle → Claude reviews her public profile and fills niche/aesthetic notes → copy her private link from the roster. Current roster: Anllela Sagra, Vale Bragg, Shayna Holt (+ Derrek's preview + demo). Pending: Sarah H (need her handle); confirm Shayna is @itsshaynaholt vs @shaynaholt.
- **Weekly refresh:** research fresh IG formats/features → write `data/weekly/<YYYY-WW>.json` → register it in `data/weekly/index.ts` → `vercel deploy --prod --yes`. See `WEEKLY.md`.
- **Rotate a leaked link:** null out the girl's `token` in the DB and reload any page (boot backfill assigns a fresh one), or update it directly.
- **Local dev:** `npm install && ADMIN_PASSWORD=admin-dev npm run dev` — zero external deps, PGlite auto-seeds.

## Integration notes for the platform

- The whole thing is ~10 source files with no framework lock-in beyond Next; the durable assets are the **content JSONs**, the **niche taxonomy**, the **plan algorithm**, and the **task-card/mockup UX**. The admin panel is throwaway if the platform already has creator management — map its creator records to `{niche, secondary_niche, token}` and reuse the rest.
- Env vars needed wherever it lands: `DATABASE_URL`, `ADMIN_PASSWORD`, `AUTH_SECRET`.
- Deliberately not built (decided against, not forgotten): per-girl passcodes (replaced by token links), reels section (data kept), peer-content example links, any scraping of individuals.
