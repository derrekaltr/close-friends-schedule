# niches/ — the creator-niche layer

Conditioning data for Close Friends content generation, ported (playbook-only) from the `modelsniche` research repo.

| File | What it is |
|---|---|
| [`taxonomy.md`](taxonomy.md) | 21 niches in 6 families: voice, visual signature, audience, hybrids, and **CF content angles** per niche |
| [`decision-guide.md`](decision-guide.md) | The step-by-step path from a creator's attributes to her primary niche + hybrid + operating model |
| [`niches.json`](niches.json) | The same taxonomy machine-readable: keywords, tone, and `cf_angles` per niche code, for the content engine |
| [`post-formats.md`](post-formats.md) | The 7 story *shapes* distilled from real example posts, with recipes, niche flavoring and the weekly mix |
| [`formats.json`](formats.json) | The formats machine-readable, with mix shares and rules |
| [`mockups/`](mockups/) | Client-facing visual examples: an original 1080×1920 story mockup per format + a contact sheet (`build_mockups.py` regenerates) |

Source research (verified example handles, the Instagram tagging rules, the classifier and prospect batches) intentionally stays in `modelsniche` — this repo is public and that material names real people.
| [`../schedule/generate.py`](../schedule/generate.py) | 7-day schedule generator: creator + niche + formats → md/json/png weekly board (`--niche C1 --hybrid A1,D2 --png`) |
