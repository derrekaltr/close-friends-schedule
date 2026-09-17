# Weekly refresh workflow

Run this once a week (Sunday or Monday morning) so every girl's issue opens with fresh material.

## What the refresh does

1. **Research**: find what's currently working in each active niche — new story/reel formats, trending audio types, and any Instagram feature changes. Sources: platform-update blogs (SocialBee, HeyOrca, NapoleonCat run monthly IG changelogs), plus the team's own saved inspiration folder.
2. **Write** the findings into `data/weekly/<YYYY-WW>.json` using the same item shape as `data/content-library.json`:

```json
{
  "stories": [
    { "id": "w38-01", "title": "…", "prompt": "…", "pillar": "food-coffee",
      "sticker": "poll", "time": "midday", "niches": ["soft-luxury"] }
  ],
  "reels": [
    { "id": "w38-r1", "hook": "…", "concept": "…", "feature": "trial-reel", "niches": ["*"] }
  ],
  "features_to_try": []
}
```

3. **Regenerate**: `node tools/generate.mjs`. Items from the weekly file are flagged **"new this week"** on every matching dashboard and placed first.

Evergreen winners can be promoted from a weekly file into `data/content-library.json` so they enter the permanent rotation.

## Doing the refresh with Claude

Ask in a session: *"Run the weekly refresh — research fresh content formats for the niches in creators/, write data/weekly/<week>.json, and regenerate."* Claude will web-search current formats and feature updates, author the weekly file, and rerun the generator.

What Claude will use for research: public trend/format roundups and platform changelogs — i.e. "what formats are working in the clean-girl niche right now."
What it won't do: scrape or profile individual accounts. If you want specific inspiration reels included, save links in `data/inspiration/` and they can be referenced in the weekly file by hand.

## Team inspiration folder (optional but recommended)

Have each manager drop 3–5 links of strong story/reel examples per niche into `data/inspiration/<niche>.md` during the week. The refresh turns those into concrete prompts — real examples beat generic trend reports every time.
