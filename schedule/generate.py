#!/usr/bin/env python3
"""Generate a 7-day Close Friends story schedule for a creator.

    python3 schedule/generate.py --niche C1 --hybrid A1,D2 --name daisy.rae \
        --out schedule/example-week --png

Inputs: niches/niches.json (cf_angles per niche) and niches/formats.json (shapes, mix, rules).
Deterministic for a given --seed. Outputs <out>.md, <out>.json and optionally <out>.png
(client-facing weekly board, rendered with headless Chrome).
"""
from __future__ import annotations
import argparse, json, os, random, subprocess, tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
PROP_DAY = 2  # Wednesday — F05 recurs on a fixed weekday so insiders expect it
TIME = {"F01": "morning", "F02": "morning", "F03": "midday", "F04": "morning",
        "F05": "afternoon", "F06": "midday", "F07": "evening"}
TIME_RANK = {"morning": 0, "midday": 1, "afternoon": 2, "evening": 3}
STICKERS = ["poll (2 options)", "question box", '"DM me a word" bait', "emoji slider", "this-or-that poll"]

# ---------------------------------------------------------------- idea pools
# F07 ideas come from the niche's own cf_angles. The connective formats draw from
# these pools: exact niche code first, then family letter, then the generic pool.
GENERIC = {
 "F01": ["coffee being poured, no face", "grocery haul on the counter", "getting ready — jewelry only",
         "car passenger-seat clip on the way somewhere", "late-night snack being made"],
 "F02": ["mirror-marker note to the viewers", "sticky note on the laptop with today's mood",
         "whiteboard confession of the day"],
 "F03": ["relationship meme in her voice", "'me waiting for you to text back' meme",
         "screenshot joke that matches her humor"],
 "F04": ["golden-hour view from wherever she is", "rain on the window, music implied",
         "the street on her walk, no caption"],
 "F05": ["the named prop shows up somewhere it shouldn't", "prop 'stole' something of hers this week",
         "prop dressed for the occasion"],
 "F06": ["content-day aftermath: ring light, mess, deadpan caption", "editing on the couch, screen glow only",
         "the setup before anyone sees the result"],
}
POOLS = {
 "A1": {"F01": ["bedhead just-woke-up selfie", "night routine, lights low", "cooking dinner for one, hands only"],
        "F04": ["neighborhood at dusk", "her street in the rain"]},
 "A2": {"F01": ["steaming the dress for tomorrow's shoot", "packing the garment bag"],
        "F04": ["hotel corridor, heels in hand", "city from the hotel window"],
        "F06": ["set BTS: lights being rigged", "unretouched outtake energy, face cropped"]},
 "A3": {"F01": ["lacing the platforms", "painting nails black, close-up"],
        "F02": ["lyric of the day on the mirror in eyeliner"],
        "F04": ["venue alley before the show", "candles + vinyl corner of the room"],
        "F05": ["the skull mug appears again"]},
 "A4": {"F01": ["pink smoothie being made", "unboxing something pink"],
        "F02": ["lipstick note on the mirror"],
        "F04": ["nail salon chair POV"]},
 "A5": {"F01": ["victory rolls in progress", "baking in the vintage apron"],
        "F04": ["the classic car on the corner", "record player spinning"]},
 "B1": {"F01": ["'good morning' clip, voice only", "making his side of the bed joke"],
        "F03": ["'us' memes, couple POV"]},
 "B2": {"F01": ["scrubs/uniform coming off after shift — shoes first", "break-room coffee, badge flipped"],
        "F06": ["the commute before anyone's awake"]},
 "B3": {"F02": ["task of the day on the whiteboard", "rules reminder in marker"],
        "F05": ["the crown paperweight watches"]},
 "B4": {"F02": ["punchline of the day on the fridge"],
        "F03": ["her own tweet screenshotted", "meme with her one-line roast on top"]},
 "C1": {"F01": ["cast-iron breakfast on the stove", "boots by the door, mud and all", "feeding the horses, gloves on"],
        "F04": ["field from the truck bed at golden hour", "storm rolling in over the pasture"],
        "F05": ["the truck gets a name and a cameo"],
        "F06": ["hauling hay before 8am, deadpan"]},
 "C2": {"F01": ["munchies run POV", "rolling tray close-up, hands only"],
        "F04": ["smoke curling in the lamp light"],
        "F05": ["the desk ninja guards the stash again"]},
 "C3": {"F01": ["camp coffee on the burner", "packing the van, doors open"],
        "F04": ["trailhead at sunrise", "tent view, rain outside"]},
 "C4": {"F01": ["rinsing sand off on the deck", "salt-hair don't care mirror clip"],
        "F04": ["shoreline at first light", "palms from the towel POV"]},
 "D1": {"F01": ["morning coffee in the robe", "wine being poured, 8pm energy", "school-run sunglasses selfie"],
        "F02": ["note to self on the fridge, mom edition"],
        "F03": ["mom-life meme with her spin"]},
 "D2": {"F01": ["hair routine close-up (the trait IS the content)", "freckle-count sunlight selfie"],
        "F03": ["'certified' running joke meme"]},
 "D3": {"F01": ["pre-workout shaker + playlist", "meal prep containers lined up"],
        "F04": ["empty gym at 5am"],
        "F06": ["post-leg-day stairs struggle, deadpan"]},
 "E1": {"F01": ["GRWM transformation, jump cuts", "skincare wind-down"],
        "F03": ["community in-joke meme"]},
 "E2": {"F01": ["morning routine, towel era", "cooking something that isn't chicken and rice (it is)"],
        "F06": ["gym bag + passport on the bed"]},
 "F1": {"F01": ["wig prep on the desk", "con-bag packing chaos"],
        "F05": ["the wig head has opinions"],
        "F06": ["costume WIP: glue gun everywhere"]},
 "F2": {"F01": ["pre-stream snack run", "post-stream decompress, headset off"],
        "F04": ["RGB room at night, door cracked"],
        "F06": ["overlay tweaks, screen glow"]},
 "F3": {"F01": ["soundcheck footsteps, venue empty"],
        "F04": ["venue before doors", "skyline from the green room"],
        "F06": ["studio session, faders only"]},
}

def pool(fmt: str, codes: list[str]) -> list[str]:
    seen, out = set(), []
    for c in codes:
        for src in (POOLS.get(c, {}).get(fmt, []),):
            for i in src:
                if i not in seen: seen.add(i); out.append(i)
    for i in GENERIC.get(fmt, []):
        if i not in seen: seen.add(i); out.append(i)
    return out

def build_week(niches, formats, primary, hybrids, per_day, rng):
    codes = [primary] + hybrids
    by_code = {n["code"]: n for n in niches}
    angles = list(by_code[primary]["cf_angles"])
    for h in hybrids:                      # ~1 in 3 spice slots from the hybrid
        angles += by_code[h]["cf_angles"][:2]
    rng.shuffle(angles)

    total = per_day * 7
    quota = {f["id"]: max(0, round(f["share"] * total)) for f in formats}
    quota["F05"] = 1                                        # fixed prop day
    while sum(quota.values()) > total:
        quota[max(("F01","F03","F04"), key=lambda k: quota[k])] -= 1
    while sum(quota.values()) < total:
        quota[rng.choice(["F01", "F03"])] += 1

    day_fmts = [[] for _ in range(7)]
    day_fmts[PROP_DAY].append("F05")
    spice_days = rng.sample([d for d in range(7)], k=min(quota["F07"], 7))
    for d in spice_days: day_fmts[d].append("F07")
    rest = [f for f in ("F01","F02","F03","F04","F06") for _ in range(quota[f])]
    rng.shuffle(rest)
    order = sorted(range(7), key=lambda d: len(day_fmts[d]))
    di = 0
    for f in rest:
        for _ in range(7):
            d = order[di % 7]; di += 1
            if len(day_fmts[d]) < per_day:
                day_fmts[d].append(f); break

    used = {f: iter(rng.sample(pool(f, codes), len(pool(f, codes)))) for f in ("F01","F02","F03","F04","F05","F06")}
    ai = iter(angles)
    week, story_no = [], 0
    for d in range(7):
        fmts = day_fmts[d]
        stories = []
        for f in fmts:
            if f == "F07":
                idea = next(ai, None) or rng.choice(by_code[primary]["cf_angles"])
            else:
                idea = next(used[f], None) or rng.choice(pool(f, codes))
            story_no += 1
            t = TIME[f]
            low = idea.lower()
            if any(k in low for k in ("night", "wine", "8pm", "late", "evening", "dinner", "post-stream",
                                       "afterparty", "wind-down", "goodnight", "dusk", "lamp light")):
                t = "evening"
            elif any(k in low for k in ("sunrise", "5am", "before 8am", "wake", "morning", "breakfast", "coffee")):
                t = "morning"
            s = {"format": f, "time": t, "idea": idea}
            if story_no % 3 == 0:
                s["reply_mechanic"] = STICKERS[(story_no // 3 - 1) % len(STICKERS)]
            stories.append(s)
        # opener = earliest F04/F01 of the day (never F07); rest in time order
        openers = [s for s in stories if s["format"] in ("F04", "F01")] or                   [s for s in stories if s["format"] != "F07"] or stories
        first = min(openers, key=lambda x: TIME_RANK[x["time"]])
        rest = sorted((s for s in stories if s is not first), key=lambda x: TIME_RANK[x["time"]])
        week.append({"day": DAYS[d], "stories": [first] + rest})
    return week, quota

def to_md(name, primary, hybrids, week, by_code, fmt_names):
    lines = [f"# 7-day Close Friends schedule — @{name}",
             "", f"**Niche:** {primary} · {by_code[primary]['name']}"
             + (f" · hybrid {', '.join(h + ' ' + by_code[h]['name'] for h in hybrids)}" if hybrids else ""),
             "", "Rules applied: day opens with B-roll or slice-of-life · max one spice story per day · "
             "prop day is Wednesday · every third story carries a reply mechanic.", ""]
    for day in week:
        lines.append(f"## {day['day']}")
        for s in day["stories"]:
            extra = f" — **{s['reply_mechanic']}**" if "reply_mechanic" in s else ""
            lines.append(f"- `{s['format']}` {fmt_names[s['format']]} · *{s['time']}* — {s['idea']}{extra}")
        lines.append("")
    return "\n".join(lines)

FMT_COLORS = {"F01":"#e8b88a","F02":"#c9cdd2","F03":"#8fb8e8","F04":"#e8d58a",
              "F05":"#b8e8a0","F06":"#8fa0e8","F07":"#e88fb0"}

def to_png(out, name, primary, hybrids, week, by_code, fmt_names):
    cols = ""
    for day in week:
        cards = ""
        for s in day["stories"]:
            mech = f'<div class="mech">↩ {s["reply_mechanic"]}</div>' if "reply_mechanic" in s else ""
            cards += (f'<div class="card"><div class="tag" style="background:{FMT_COLORS[s["format"]]}">'
                      f'{s["format"]}</div><div class="tm">{s["time"]}</div>'
                      f'<div class="idea">{s["idea"]}</div>{mech}</div>')
        cols += f'<div class="col"><h2>{day["day"]}</h2>{cards}</div>'
    legend = "".join(f'<span><i style="background:{FMT_COLORS[f]}"></i>{f} {fmt_names[f]}</span>' for f in FMT_COLORS)
    hyb = f" · hybrid {', '.join(hybrids)}" if hybrids else ""
    html = f"""<!doctype html><html><head><meta charset="utf-8"><style>
    body{{margin:0;width:2600px;background:#101014;font-family:-apple-system,'Helvetica Neue',sans-serif;padding:60px}}
    h1{{color:#fff;font-size:54px;margin:0}} .sub{{color:#9a9aa2;font-size:28px;margin:10px 0 30px}}
    .legend{{display:flex;gap:28px;flex-wrap:wrap;margin:0 0 36px}}
    .legend span{{color:#cfcfd6;font-size:22px;display:flex;align-items:center;gap:10px}}
    .legend i{{width:26px;height:26px;border-radius:8px;display:inline-block}}
    .grid{{display:grid;grid-template-columns:repeat(7,1fr);gap:22px}}
    .col h2{{color:#fff;font-size:26px;margin:0 0 14px;font-weight:600}}
    .card{{background:#1a1b21;border-radius:18px;padding:16px 16px 14px;margin-bottom:14px;position:relative}}
    .tag{{display:inline-block;color:#111;font-weight:700;font-size:18px;padding:4px 10px;border-radius:8px}}
    .tm{{position:absolute;top:18px;right:16px;color:#7c7c86;font-size:17px}}
    .idea{{color:#e6e6ea;font-size:20px;line-height:1.45;margin-top:10px}}
    .mech{{color:#8fd0b8;font-size:17px;margin-top:8px}}
    </style></head><body>
    <h1>Close Friends — 7-day schedule</h1>
    <div class="sub">@{name} · {primary} {by_code[primary]["name"]}{hyb}</div>
    <div class="legend">{legend}</div><div class="grid">{cols}</div></body></html>"""
    with tempfile.NamedTemporaryFile("w", suffix=".html", delete=False, encoding="utf-8") as f:
        f.write(html); path = f.name
    subprocess.run([CH, "--headless=new", "--disable-gpu", "--no-sandbox", "--hide-scrollbars",
                    "--window-size=2720,1500", "--virtual-time-budget=3000",
                    f"--screenshot={out}.png", f"file://{path}"], capture_output=True, timeout=60)
    os.unlink(path)

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--niche", required=True); ap.add_argument("--hybrid", default="")
    ap.add_argument("--name", default="creator"); ap.add_argument("--per-day", type=int, default=4)
    ap.add_argument("--seed", type=int, default=7); ap.add_argument("--out", default="schedule/week")
    ap.add_argument("--png", action="store_true")
    a = ap.parse_args()
    data = json.load(open(os.path.join(ROOT, "niches", "niches.json"), encoding="utf-8"))
    fdata = json.load(open(os.path.join(ROOT, "niches", "formats.json"), encoding="utf-8"))
    by_code = {n["code"]: n for n in data["niches"]}
    fmt_names = {f["id"]: f["name"] for f in fdata["formats"]}
    hybrids = [h for h in a.hybrid.split(",") if h]
    assert a.niche in by_code, f"unknown niche {a.niche}"
    for h in hybrids: assert h in by_code, f"unknown hybrid {h}"
    rng = random.Random(a.seed)
    week, quota = build_week(data["niches"], fdata["formats"], a.niche, hybrids, a.per_day, rng)
    # sanity: rules hold
    for day in week:
        assert sum(1 for s in day["stories"] if s["format"] == "F07") <= 1
        assert day["stories"][0]["format"] != "F07"
    open(f"{a.out}.md", "w", encoding="utf-8").write(to_md(a.name, a.niche, hybrids, week, by_code, fmt_names))
    json.dump({"creator": a.name, "primary": a.niche, "hybrids": hybrids, "seed": a.seed, "week": week},
              open(f"{a.out}.json", "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    if a.png: to_png(a.out, a.name, a.niche, hybrids, week, by_code, fmt_names)
    print(f"wrote {a.out}.md/.json" + ("/.png" if a.png else ""), "| quota:", quota)

if __name__ == "__main__":
    main()
