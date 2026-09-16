# close-friends-schedule

Content-idea generation for creators' Instagram Close Friends stories.

- [`niches/`](niches/) — the creator-niche layer: which niche a creator is, how to determine it, and what CF content lane each niche implies.
- [`schedule/`](schedule/) — the 7-day Close Friends schedule generator + example weeks (md/json/png).

## Weekly workflow

1. Keep the client roster in `schedule/roster.csv` (gitignored — real handles never enter this public repo). Format documented in [`schedule/roster.example.csv`](schedule/roster.example.csv): handle, niche code, hybrids (`A1|D2`), name, stories per day, optional seed, notes. Leave `niche` empty for new signees — they're listed as *unassigned* until someone runs [`niches/decision-guide.md`](niches/decision-guide.md).
2. Run `python3 schedule/batch.py --roster schedule/roster.csv` — every assigned client gets `schedule/weeks/<handle>/week.md|.json|.png`, plus `weeks/roster.md` and `weeks/roster-board.png` (the client overview board — see [`schedule/roster-board.example.png`](schedule/roster-board.example.png)).
3. Next week: bump `--seed-offset 1` (2, 3, …) to reshuffle everyone deterministically without touching the roster.

Single client: `python3 schedule/generate.py --niche C1 --hybrid A1,D2 --name handle --png`.
