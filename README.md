# The Weekly Edit

A per-creator, passcode-locked weekly content planner for lifestyle creators. Each girl gets her own private page ("issue") that refreshes weekly with a 7-day close-friends story schedule, reel ideas, and current Instagram features to try — all matched to her niche.

## Scope (read this first)

This system plans **genuine lifestyle content only** — real routines, real errands, real personality. It deliberately does not include:

- outreach/DM scripts or engagement quotas
- scraping data about individual people
- content engineered to disguise a pitch as friendship

Standing rule baked into every dashboard: when a conversation turns commercial (someone asks about working together), the agency relationship is disclosed. Real content doesn't need a cover story, and undisclosed commercial content is an FTC problem anyway.

## How it works

```
creators/*.json          one profile per girl (from onboarding)
data/niches.json         8-niche taxonomy: signals, pillars, aesthetics
data/content-library.json  ~80 story/reel ideas tagged by niche + IG feature
data/weekly/YYYY-WW.json   fresh research added by the weekly refresh (optional)
tools/generate.mjs       builds site/<slug>/index.html, AES-encrypted per passcode
onboarding/index.html    intake form + niche-fit quiz → downloads her profile JSON
```

### Onboard a new girl

1. Send her `onboarding/index.html` (open locally or host it). She fills in name, email, Gmail, a passcode, and the 6-question niche quiz.
2. The page suggests her primary + secondary niche and downloads `<slug>.json`.
3. Drop that file into `creators/` (review/edit the suggested niche if you know her better).
4. Run `node tools/generate.mjs`.

### Generate / refresh dashboards

```sh
node tools/generate.mjs            # current ISO week
node tools/generate.mjs --week 2026-40   # a specific week
```

Output: `site/<slug>/index.html` — a single self-contained file per girl. Host the `site/` folder anywhere static (Netlify, Vercel, S3, GitHub Pages on a private repo). Send each girl her link and her passcode **in separate private messages**.

The plan rotates deterministically by ISO week, so re-running in the same week gives the same schedule, and every week is automatically different.

### The lock is real encryption

The page content is AES-256-GCM encrypted with her passcode (PBKDF2, 200k iterations). Without the passcode the HTML contains only ciphertext — it is not a hide/show trick. Caveats: anyone with the passcode can share the decrypted content, and short guessable passcodes can be brute-forced offline, so use decent passcodes.

To keep passcodes out of git, leave `"passcode"` empty in the JSON and set `PASSCODE_<SLUG>` (dashes → underscores, uppercase) when generating, e.g. `PASSCODE_DEMO_GIRL=peach123 node tools/generate.mjs`.

### Weekly refresh

See `WEEKLY.md` — the workflow for researching fresh formats/trends each week and regenerating all dashboards.

## Try it

A demo profile ships in `creators/demo-girl.json` (passcode `peach123`). Open `site/demo-girl/index.html` in a browser. Delete the demo before onboarding real creators.
