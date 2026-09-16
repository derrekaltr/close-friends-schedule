# Decision guide — how a creator gets to her niche

This is the "what should she be" walkthrough: a fixed sequence of questions that takes a new creator's attributes and lands on a **primary niche + hybrid + operating model**, which then selects the Close Friends content lane in [`taxonomy.md`](taxonomy.md) / [`niches.json`](niches.json).

Two principles drive every step, in order of importance:
1. **Authenticity beats aesthetics.** A niche she actually lives (real tattoos, real ranch, real gym habit, real age) converts better than one she performs — and she can film it every day without burning out.
2. **Sustainability beats ceiling.** Pick the lane she can shoot weekly with what she already has. Budget-, audience- and career-gated niches are only for creators who arrive with those assets.

---

## Step 0 — Arrival assets (crossover check)

Does she already have one of these? If yes, that's the lane — the audience precedes the page.

| She arrives with… | → Niche |
|---|---|
| An active Twitch/Kick stream | **F2 Streamer** |
| A real music/DJ career | **F3 Musician** |
| An established cosplay/con presence | **F1 Cosplay** |
| Stand-up / podcast / a genuinely funny public voice | **B4 Comedy** |
| A large mainstream following (1M+) | run her existing brand as the base; add the paid layer carefully (celebrity-tier handling) |

No arrival assets → continue.

## Step 1 — Fixed attributes (can't be chosen, can't be faked)

Check in this order; the first strong hit becomes a **lock or lens**:

1. **35 or older** → **D1 MILF/mature** is the primary lens. Everything else becomes flavor ("goth mom", "country mama", "muscle mommy").
2. **Male** → **E2** (sub-style by build: gym-bro / twink / himbo / performer). Stop here; other steps only pick the flavor.
3. **Trans** → **E1** as the identity layer, then continue the steps to pick her host niche (fitness, cosplay, GND…).
4. **Visibly modded / alt** (tattoos, piercings, alt styling she already wears) → **A3 Alt/goth** is a strong differentiator candidate.
5. **A standout single trait** (natural redhead, striking height, heavy freckles) → carry **D2 Trait** forward as a *modifier* on whatever wins below.

## Step 2 — Lifestyle access (what her camera roll already looks like)

Score each yes; the strongest genuine one is a differentiator candidate:

- Lives rural / rides / rodeo / trucks → **C1 Country**
- Beach town, surfs, boat access → **C4 Beach**
- Hikes, camps, van, national parks → **C3 Outdoorsy**
- Daily cannabis lifestyle → **C2 Stoner**
- Trains seriously, visible physique → **D3 Fitness-forward**
- Has a tellable "real job" (nurse, flight attendant, teacher-adjacent, office) → **B2 Profession** *(weigh the employment risk with her first)*

## Step 3 — Persona & skills (what she can sustain in DMs and captions)

- High message-stamina, warm, consistent → **B1 GFE** — this is the **operating model for everyone**, not a differentiator; note it and move on.
- Naturally funny on camera → upgrade toward **B4 Comedy**.
- Dominant persona, thick skin, comfortable monetizing power exchange → **B3 Femdom** — but flag: Instagram/CF is the wrong primary channel; only choose if she'll run X/Telegram.
- Craft skills (sewing, wigs, SFX makeup) → **F1 Cosplay** candidate.
- Hyper-feminine maximalist who'll commit to the bit → **A4 Bimbo**; styling-obsessed with vintage flair → **A5 Pin-up**.

## Step 4 — Resources

- Shoot budget + model look + patience for a slow start → **A2 Glamour** becomes viable.
- None of the above landed anywhere → **A1 Girl-next-door** is the base. It is never wrong, only insufficient *alone*.

## Step 5 — Assemble the outcome

**PRIMARY** = the strongest lock/lens from Steps 0–1, else the strongest authentic differentiator from Steps 2–3, else A1.
**HYBRID** = the next-strongest candidate (A1 counts as the default base; D2 traits attach here).
**OPERATING MODEL** = B1 GFE for everyone (it's the DM/CF mechanic, whatever the aesthetic).

Sanity checks before locking it in:
- *Weekly-filmable test*: can she produce this lane 4–5×/week with her actual life? If not, demote it to hybrid.
- *Saturation test*: if the outcome is bare A1 or bare C4, push harder for a differentiator — those lanes are the most crowded.
- *Channel test*: B3 outcome → primary channel is X/Telegram, CF is secondary.

**Output format** (what the content engine consumes): `primary`, `hybrid[]`, `operating_model: "B1"`, plus the merged `cf_angles` from `niches.json` (lead with primary's angles, ~1 in 3 from the hybrid).

---

## Worked examples

1. **24, tattooed sleeve, works front desk at a gym, trains daily, witty in DMs** → Step 1 hits A3 (modded); Step 2 hits D3 (real training). PRIMARY **A3**, HYBRID **D3**, model B1. CF lane: corset/ink content with gym-fit checks mixed in.
2. **38, mom of two, lives on a ranch, no social presence** → Step 1 locks the **D1** lens; Step 2 adds C1. PRIMARY **D1**, HYBRID **C1** ("country mama"), model B1. CF lane: morning-coffee confidence + golden-hour ranch teases.
3. **21, natural redhead, beach town, no strong persona** → Step 1 flags D2 (modifier); Step 2 hits C4; Step 4 base A1. PRIMARY **C4**, HYBRID **A1 + D2**, model B1. CF lane: bikini try-ons with trait-forward framing and GND warmth.
4. **27, streams on Twitch 4 nights/week, cosplays** → Step 0 locks **F2**; F1 hybrid. CF lane: "chat can't see this" + costume builds.

## Anti-patterns (how outcomes go wrong)

- Choosing **glamour** because it looks premium, without budget — she'll post twice and stall. A1+trait outperforms an unfunded A2.
- Choosing **femdom** because the per-fan revenue is highest — without the persona and the X-first channel strategy it produces nothing on CF.
- Treating **GFE as a niche** instead of the operating model — "your online girlfriend" with no visual identity has nothing to shoot.
- Stacking three differentiators — one primary + one hybrid; more reads as unfocused and burns her out.
