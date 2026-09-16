#!/usr/bin/env python3
"""Batch mode: generate a week for every client on the roster + a roster overview board.

    python3 schedule/batch.py --roster schedule/roster.csv [--seed-offset 0] [--no-png]

Roster CSV columns (header required):
    handle   — Instagram handle, no @             (required)
    niche    — primary niche code, e.g. C1        (empty = unassigned; listed, not scheduled)
    hybrids  — pipe- or space-separated codes, e.g. "A1|D2"
    name     — display name (defaults to handle)
    per_day  — stories per day (default 4)
    seed     — int; empty = stable hash of handle (so reruns don't reshuffle everyone)
    notes    — anything the team should remember about the client

Outputs (all gitignored — real client data stays out of the public repo):
    schedule/weeks/<handle>/week.md / week.json / week.png
    schedule/weeks/roster.md and roster-board.png (the client overview)
"""
from __future__ import annotations
import argparse, csv, hashlib, json, os, random, subprocess, sys, tempfile

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from generate import build_week, to_md, to_png, ROOT, CH  # noqa: E402

FAMILY_COLORS = {"A": "#e8b88a", "B": "#8fb8e8", "C": "#b8e8a0", "D": "#e8d58a", "E": "#c9a0e8", "F": "#8fa0e8"}

def stable_seed(handle: str, offset: int) -> int:
    return int(hashlib.sha256(handle.encode()).hexdigest()[:8], 16) % 100000 + offset

def load_roster(path: str) -> list[dict]:
    rows = []
    with open(path, newline="", encoding="utf-8") as f:
        for r in csv.DictReader(f):
            h = (r.get("handle") or "").strip().lstrip("@")
            if not h or h.startswith("#"):
                continue
            rows.append({
                "handle": h,
                "niche": (r.get("niche") or "").strip().upper(),
                "hybrids": [x.upper() for x in (r.get("hybrids") or "").replace("|", " ").replace(",", " ").split() if x],
                "name": (r.get("name") or "").strip() or h,
                "per_day": int(r.get("per_day") or 4),
                "seed": int(r["seed"]) if (r.get("seed") or "").strip() else None,
                "notes": (r.get("notes") or "").strip(),
            })
    return rows

def roster_board(out_dir, clients, by_code, png=True):
    lines = ["# Roster overview", ""]
    cards = ""
    for c in clients:
        nn = by_code.get(c["niche"], {}).get("name", "")
        status = "unassigned — run niches/decision-guide.md" if not c["niche"] else \
                 f"{c['niche']} · {nn}" + (f"  (+ {', '.join(c['hybrids'])})" if c["hybrids"] else "")
        lines.append(f"- **@{c['handle']}** ({c['name']}) — {status}"
                     + (f" — {c['notes']}" if c["notes"] else ""))
        col = FAMILY_COLORS.get(c["niche"][:1], "#5a5a64") if c["niche"] else "#5a5a64"
        chips = (f'<span class="chip" style="background:{col}">{c["niche"]}</span>'
                 + "".join(f'<span class="chip alt">{h}</span>' for h in c["hybrids"])) if c["niche"] else \
                '<span class="chip warn">unassigned</span>'
        niche_line = nn if c["niche"] else "→ run the decision guide (niches/decision-guide.md)"
        notes = f'<div class="notes">{c["notes"]}</div>' if c["notes"] else ""
        week = '<div class="ok">week generated ✓</div>' if c["niche"] else '<div class="no">no schedule yet</div>'
        cards += (f'<div class="card"><div class="row"><div class="av">{c["name"][:1].upper()}</div>'
                  f'<div><div class="h">@{c["handle"]}</div><div class="n">{c["name"]}</div></div></div>'
                  f'<div class="chips">{chips}</div><div class="niche">{niche_line}</div>{notes}{week}</div>')
    open(os.path.join(out_dir, "roster.md"), "w", encoding="utf-8").write("\n".join(lines) + "\n")
    if not png:
        return
    html = f"""<!doctype html><html><head><meta charset="utf-8"><style>
    body{{margin:0;width:2600px;background:#101014;font-family:-apple-system,'Helvetica Neue',sans-serif;padding:60px}}
    h1{{color:#fff;font-size:54px;margin:0}} .sub{{color:#9a9aa2;font-size:28px;margin:10px 0 40px}}
    .grid{{display:grid;grid-template-columns:repeat(4,1fr);gap:26px}}
    .card{{background:#1a1b21;border-radius:20px;padding:26px}}
    .row{{display:flex;gap:18px;align-items:center;margin-bottom:16px}}
    .av{{width:74px;height:74px;border-radius:50%;background:linear-gradient(135deg,#3a3f52,#23273a);color:#fff;
        display:grid;place-items:center;font-size:34px;font-weight:700}}
    .h{{color:#fff;font-size:28px;font-weight:700;font-family:Menlo,monospace}}
    .n{{color:#8a8a94;font-size:20px;margin-top:4px}}
    .chips{{display:flex;gap:8px;flex-wrap:wrap;margin:6px 0 10px}}
    .chip{{color:#111;font-weight:700;font-size:18px;padding:5px 12px;border-radius:8px}}
    .chip.alt{{background:#2c2e38;color:#cfcfd8}} .chip.warn{{background:#e8a05a;color:#111}}
    .niche{{color:#d6d6dd;font-size:21px;line-height:1.4}}
    .notes{{color:#8fa8c8;font-size:19px;margin-top:10px;line-height:1.4}}
    .ok{{color:#8fd0b8;font-size:18px;margin-top:14px}} .no{{color:#7c7c86;font-size:18px;margin-top:14px}}
    </style></head><body><h1>Client roster — Close Friends</h1>
    <div class="sub">{len(clients)} clients · niche chips colored by family (A aesthetic · B persona · C lifestyle · D body/trait · E demographic · F crossover)</div>
    <div class="grid">{cards}</div></body></html>"""
    with tempfile.NamedTemporaryFile("w", suffix=".html", delete=False, encoding="utf-8") as f:
        f.write(html); path = f.name
    rows = (len(clients) + 3) // 4
    subprocess.run([CH, "--headless=new", "--disable-gpu", "--no-sandbox", "--hide-scrollbars",
                    f"--window-size=2720,{max(700, 260 + rows * 420)}", "--virtual-time-budget=3000",
                    f"--screenshot={os.path.join(out_dir, 'roster-board.png')}", f"file://{path}"],
                   capture_output=True, timeout=60)
    os.unlink(path)

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--roster", default="schedule/roster.csv")
    ap.add_argument("--seed-offset", type=int, default=0, help="bump to reshuffle everyone (e.g. week number)")
    ap.add_argument("--no-png", action="store_true")
    a = ap.parse_args()
    data = json.load(open(os.path.join(ROOT, "niches", "niches.json"), encoding="utf-8"))
    fdata = json.load(open(os.path.join(ROOT, "niches", "formats.json"), encoding="utf-8"))
    by_code = {n["code"]: n for n in data["niches"]}
    fmt_names = {f["id"]: f["name"] for f in fdata["formats"]}
    clients = load_roster(a.roster)
    out_root = os.path.join(os.path.dirname(os.path.abspath(a.roster)), "weeks")
    os.makedirs(out_root, exist_ok=True)
    done = skipped = 0
    for c in clients:
        if not c["niche"]:
            print(f"@{c['handle']:<20} SKIP — no niche assigned (decision-guide it first)"); skipped += 1; continue
        assert c["niche"] in by_code, f"@{c['handle']}: unknown niche {c['niche']}"
        for h in c["hybrids"]: assert h in by_code, f"@{c['handle']}: unknown hybrid {h}"
        seed = c["seed"] if c["seed"] is not None else stable_seed(c["handle"], a.seed_offset)
        rng = random.Random(seed)
        week, _ = build_week(data["niches"], fdata["formats"], c["niche"], c["hybrids"], c["per_day"], rng)
        d = os.path.join(out_root, c["handle"]); os.makedirs(d, exist_ok=True)
        open(os.path.join(d, "week.md"), "w", encoding="utf-8").write(
            to_md(c["handle"], c["niche"], c["hybrids"], week, by_code, fmt_names))
        json.dump({"creator": c["handle"], "name": c["name"], "primary": c["niche"], "hybrids": c["hybrids"],
                   "seed": seed, "notes": c["notes"], "week": week},
                  open(os.path.join(d, "week.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=2)
        if not a.no_png:
            to_png(os.path.join(d, "week"), c["handle"], c["niche"], c["hybrids"], week, by_code, fmt_names)
        print(f"@{c['handle']:<20} {c['niche']}+{','.join(c['hybrids']) or '-':<8} seed={seed} → weeks/{c['handle']}/")
        done += 1
    roster_board(out_root, clients, by_code, png=not a.no_png)
    print(f"\n{done} weeks generated, {skipped} unassigned · overview → weeks/roster.md + roster-board.png")

if __name__ == "__main__":
    main()
