#!/usr/bin/env python3
"""Render original IG-story mockups for each CF post format (F01-F07) + a contact sheet.
Stylized recreations with placeholder personas — no real people, no real screenshots.
    python3 niches/mockups/build_mockups.py
Requires Chrome (headless) on macOS."""
import os, subprocess, tempfile

CH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
OUT = os.path.dirname(os.path.abspath(__file__))

CHROME_FRAME = """<!doctype html><html><head><meta charset="utf-8"><style>
*{{margin:0;box-sizing:border-box;font-family:-apple-system,'Helvetica Neue',sans-serif}}
body{{width:1080px;height:1920px;overflow:hidden;position:relative;background:{bg}}}
.scene{{position:absolute;inset:0}}
.chrome{{position:absolute;inset:0;z-index:10;pointer-events:none}}
.bars{{position:absolute;top:28px;left:24px;right:24px;display:flex;gap:8px}}
.bars i{{flex:1;height:6px;border-radius:3px;background:rgba(255,255,255,.35)}}
.bars i.on{{background:#fff}}
.head{{position:absolute;top:56px;left:32px;display:flex;align-items:center;gap:18px}}
.av{{width:76px;height:76px;border-radius:50%;background:{av};border:3px solid rgba(255,255,255,.9)}}
.nm{{color:#fff;font-size:30px;font-weight:600;text-shadow:0 1px 8px rgba(0,0,0,.5)}}
.nm small{{font-weight:400;opacity:.75;margin-left:14px}}
.x{{position:absolute;top:66px;right:40px;color:#fff;font-size:44px;opacity:.9;text-shadow:0 1px 8px rgba(0,0,0,.5)}}
.foot{{position:absolute;bottom:36px;left:32px;right:32px;display:flex;align-items:center;gap:26px}}
.msg{{flex:1;height:84px;border:2px solid rgba(255,255,255,.75);border-radius:44px;color:rgba(255,255,255,.85);font-size:30px;display:flex;align-items:center;padding-left:34px}}
.ic{{color:#fff;font-size:44px;opacity:.9}}
.cap{{position:absolute;left:50%;transform:translateX(-50%);background:rgba(0,0,0,.0);color:#fff;font-size:52px;font-weight:500;text-shadow:0 2px 14px rgba(0,0,0,.65);white-space:nowrap}}
.capbox{{position:absolute;left:50%;transform:translateX(-50%);background:rgba(0,0,0,.55);color:#fff;font-size:46px;padding:16px 34px;border-radius:14px;white-space:nowrap}}
{extra}
</style></head><body>
<div class="scene">{scene}</div>
<div class="chrome">
  <div class="bars">{bars}</div>
  <div class="head"><div class="av"></div><div class="nm">{name}<small>{age}</small></div></div>
  <div class="x">✕</div>
  <div class="foot"><div class="msg">Send message…</div><div class="ic">♡</div><div class="ic">➢</div></div>
</div>
</body></html>"""

def bars(n, on):
    return "".join(f'<i class="{"on" if i<=on else ""}"></i>' for i in range(n))

FRAMES = {
"F01": dict(name="daisy.rae", age="2m", bg="linear-gradient(180deg,#e8d5c0 0%,#d9c2a8 40%,#c9ad90 100%)", av="linear-gradient(135deg,#f5b78a,#d98555)", nbars=(5,1),
 extra=""".counter{position:absolute;bottom:0;left:0;right:0;height:44%;background:linear-gradient(180deg,#f2ece2,#e5dccc)}
 .board{position:absolute;bottom:26%;left:8%;width:70%;height:34%;background:linear-gradient(135deg,#a8763e,#8f5f2e 60%,#a8763e);border-radius:36px;transform:rotate(-4deg);box-shadow:0 30px 60px rgba(0,0,0,.25)}
 .steak{position:absolute;border-radius:18px;background:linear-gradient(135deg,#8f4a3a,#b06a52 55%,#7c3d30)}
 .tort{position:absolute;bottom:6%;left:-6%;width:46%;height:20%;border-radius:50%;background:radial-gradient(circle at 40% 40%,#f0d38a,#ddb95e);box-shadow:0 12px 30px rgba(0,0,0,.18)}
 .knife{position:absolute;bottom:34%;right:10%;width:9%;height:30%;background:linear-gradient(180deg,#5c6b5a 0 34%,#c8ccd2 34%);border-radius:14px;transform:rotate(18deg)}""",
 scene="""<div class="counter"></div><div class="board"></div>
 <div class="steak" style="bottom:36%;left:14%;width:20%;height:7%"></div>
 <div class="steak" style="bottom:41%;left:26%;width:24%;height:7%;transform:rotate(-8deg)"></div>
 <div class="steak" style="bottom:31%;left:30%;width:22%;height:7%;transform:rotate(5deg)"></div>
 <div class="steak" style="bottom:44%;left:16%;width:16%;height:6%;transform:rotate(-14deg)"></div>
 <div class="tort"></div><div class="knife"></div>
 <div class="cap" style="bottom:47%;font-family:Georgia,serif;font-weight:400">taco tuesday 🫶</div>"""),
"F02": dict(name="daisy.rae", age="8:13 AM", bg="linear-gradient(180deg,#c9cdd2,#b6babf 50%,#c2c6cb)", av="linear-gradient(135deg,#f5b78a,#d98555)", nbars=(8,3),
 extra=""".fridge{position:absolute;inset:0;background:linear-gradient(115deg,#c4c8cd 0%,#dfe3e7 30%,#b9bdc2 70%)}
 .handle{position:absolute;left:6%;top:22%;width:26px;height:52%;border-radius:14px;background:linear-gradient(90deg,#9aa0a6,#e8ecf0,#8d9399)}
 .wb{position:absolute;left:16%;top:20%;width:66%;height:52%;background:#fdfdfb;border-radius:26px;box-shadow:0 18px 50px rgba(0,0,0,.22);transform:rotate(-1.5deg)}
 .wb div{font-family:'Marker Felt','Comic Sans MS',cursive;color:#2b2b2b;font-size:96px;line-height:1.35;padding:70px 60px 0}
 .wb u{text-decoration:none;border-bottom:8px solid #2b2b2b}
 .magnet{position:absolute;width:52px;height:52px;border-radius:50%;background:radial-gradient(circle at 35% 35%,#6fa8dc,#2f6396)}""",
 scene="""<div class="fridge"></div><div class="handle"></div>
 <div class="wb"><div>I work too<br>hard to not<br><u>own a boat</u></div></div>
 <div class="magnet" style="left:22%;top:18.5%"></div>
 <div class="cap" style="bottom:16%;font-size:44px">manifesting 🧾❤️</div>"""),
"F03": dict(name="daisy.rae", age="30m", bg="linear-gradient(180deg,#f2f3f5,#e7e9ec)", av="linear-gradient(135deg,#f5b78a,#d98555)", nbars=(3,0),
 extra=""".card{position:absolute;left:8%;top:26%;width:84%;height:40%;background:#fff;border-radius:40px;box-shadow:0 24px 70px rgba(0,0,0,.14)}
 .ts{position:absolute;top:12%;width:100%;text-align:center;color:#8e8e93;font-size:30px}
 .bub{position:absolute;font-size:44px;padding:22px 38px;border-radius:44px;max-width:70%}
 .grey{left:6%;top:26%;background:#e9e9eb;color:#111}
 .blue{right:6%;top:52%;background:#0b84fe;color:#fff}
 .read{position:absolute;right:7%;top:70%;color:#8e8e93;font-size:26px}
 .credit{position:absolute;left:9%;bottom:30%;color:rgba(0,0,0,.35);font-size:28px}
 .nm{color:#111!important;text-shadow:none!important}.x{color:#111!important;text-shadow:none!important}
 .msg{border-color:rgba(0,0,0,.35)!important;color:rgba(0,0,0,.55)!important}.ic{color:#111!important}
 .bars i{background:rgba(0,0,0,.15)}.bars i.on{background:#555}""",
 scene="""<div class="card"><div class="ts">Today 9:38 AM</div>
 <div class="bub grey">You talking to anyone?</div>
 <div class="bub blue">God</div><div class="read">Read 9:38 AM</div></div>
 <div class="credit">@memepage.credit</div>"""),
"F04": dict(name="daisy.rae", age="57s", bg="linear-gradient(180deg,#dfe6ee 0%,#f6dfb8 55%,#f2b56b 100%)", av="linear-gradient(135deg,#f5b78a,#d98555)", nbars=(4,2),
 extra=""".b{position:absolute;bottom:0;background:linear-gradient(180deg,#5a616e,#3f4550)}
 .b.glass{background:linear-gradient(180deg,#8ea2b8,#6d7f94)}
 .b.warm{background:linear-gradient(180deg,#c9a175,#a97f52)}
 .sun{position:absolute;bottom:34%;left:50%;transform:translateX(-50%);width:340px;height:340px;border-radius:50%;background:radial-gradient(circle,#ffe9b8,#f7c46b 60%,rgba(247,196,107,0));}
 .road{position:absolute;bottom:0;left:20%;right:20%;height:20%;background:linear-gradient(180deg,#6b6f76,#54575d);clip-path:polygon(28% 0,72% 0,100% 100%,0 100%)}""",
 scene="""<div class="sun"></div>
 <div class="b glass" style="left:0;width:16%;height:62%"></div>
 <div class="b" style="left:17%;width:12%;height:48%"></div>
 <div class="b warm" style="left:30%;width:10%;height:40%"></div>
 <div class="b" style="left:56%;width:14%;height:70%"></div>
 <div class="b glass" style="left:71%;width:11%;height:52%"></div>
 <div class="b warm" style="left:83%;width:17%;height:44%"></div>
 <div class="road"></div>"""),
"F05": dict(name="daisy.rae", age="10:55 AM", bg="linear-gradient(180deg,#efe9e2,#e3dcd2)", av="linear-gradient(135deg,#f5b78a,#d98555)", nbars=(6,4),
 extra=""".desk{position:absolute;bottom:0;left:0;right:0;height:52%;background:linear-gradient(180deg,#f4f1ec,#e6e1d8)}
 .mon{position:absolute;bottom:44%;left:6%;width:88%;height:34%;background:#111;border-radius:20px;padding:10px}
 .mon i{display:block;width:100%;height:100%;border-radius:12px;background:linear-gradient(135deg,#7a3d1e,#c86a2e 45%,#3d2413);}
 .stand{position:absolute;bottom:38%;left:46%;width:8%;height:7%;background:#2a2a2a}
 .ninja{position:absolute;bottom:16%;left:50%;transform:translateX(-50%);font-size:300px;filter:drop-shadow(0 20px 30px rgba(0,0,0,.25))}
 .cone{position:absolute;bottom:23.5%;left:44%;width:230px;height:52px;border-radius:26px;background:linear-gradient(90deg,#caa15c,#8a6a3a 70%,#5c4525);transform:rotate(-12deg);box-shadow:0 10px 24px rgba(0,0,0,.25)}""",
 scene="""<div class="mon"><i></i></div><div class="stand"></div><div class="desk"></div>
 <div class="ninja">🥷</div><div class="cone"></div>
 <div class="capbox" style="bottom:10%">the intern found my stash 💀</div>"""),
"F06": dict(name="daisy.rae", age="6:01 AM", bg="linear-gradient(180deg,#0d1b3d,#132a5c 55%,#0d1b3d)", av="linear-gradient(135deg,#f5b78a,#d98555)", nbars=(7,6),
 extra=""".glow{position:absolute;inset:0;background:radial-gradient(60% 40% at 50% 40%,rgba(58,110,255,.35),transparent 70%)}
 .desk{position:absolute;bottom:24%;left:4%;right:4%;height:5%;background:#1c2438;border-radius:10px}
 .leg{position:absolute;bottom:8%;width:16%;height:18%;background:#141a2a;border-radius:20px}
 .sock{position:absolute;width:11%;height:6%;background:#e8e8ea;border-radius:30px}
 .ph{position:absolute;bottom:29%;width:9%;height:14%;border-radius:12px;background:#000;border:3px solid #2e3a58;padding:4px}
 .ph i{display:block;width:100%;height:100%;border-radius:8px}
 .mn{position:absolute;width:26%;height:16%;background:#000;border:4px solid #232c44;border-radius:14px;padding:6px}
 .mn::after{content:"";position:absolute;left:42%;top:100%;width:16%;height:38px;background:#1c2438}
 .mn::before{content:"";position:absolute;left:30%;top:100%;margin-top:38px;width:40%;height:12px;border-radius:6px;background:#141a2a}
 .mn i{display:block;width:100%;height:100%;border-radius:8px}""",
 scene="""<div class="glow"></div>
 <div class="mn" style="top:16%;left:8%"><i style="background:linear-gradient(135deg,#1b3a7a,#3b6fd4)"></i></div>
 <div class="mn" style="top:14%;right:8%"><i style="background:linear-gradient(135deg,#7a1b5e,#d43b8f)"></i></div>
 <div class="mn" style="top:34%;left:20%"><i style="background:linear-gradient(135deg,#1b7a4e,#3bd48f)"></i></div>
 <div class="mn" style="top:33%;right:18%"><i style="background:linear-gradient(135deg,#23345c,#5a7ec9)"></i></div>
 <div class="ph" style="left:18%"><i style="background:linear-gradient(180deg,#2e4a8f,#6a8fe0)"></i></div>
 <div class="ph" style="left:29%"><i style="background:linear-gradient(180deg,#8f2e6a,#e06aae)"></i></div>
 <div class="ph" style="left:40%"><i style="background:linear-gradient(180deg,#2e8f5e,#6ae0a8)"></i></div>
 <div class="ph" style="left:51%"><i style="background:linear-gradient(180deg,#8f6a2e,#e0b86a)"></i></div>
 <div class="ph" style="left:62%"><i style="background:linear-gradient(180deg,#3a3a8f,#8a8ae0)"></i></div>
 <div class="ph" style="left:73%"><i style="background:linear-gradient(180deg,#8f3a3a,#e08a8a)"></i></div>
 <div class="desk"></div>
 <div class="leg" style="left:6%;transform:rotate(24deg)"></div><div class="sock" style="bottom:24.5%;left:16%;transform:rotate(18deg)"></div>
 <div class="leg" style="right:6%;transform:rotate(-24deg)"></div><div class="sock" style="bottom:24.5%;right:16%;transform:rotate(-18deg)"></div>
 <div class="capbox" style="bottom:10%">another day at the office</div>"""),
"F07": dict(name="daisy.rae", age="3m", bg="linear-gradient(180deg,#12060e,#2a0d1e 55%,#12060e)", av="linear-gradient(135deg,#f5b78a,#d98555)", nbars=(5,0),
 extra=""".spot{position:absolute;top:0;left:50%;transform:translateX(-50%);width:70%;height:80%;background:radial-gradient(50% 60% at 50% 20%,rgba(255,120,160,.30),transparent 70%)}
 .curtain{position:absolute;top:0;bottom:22%;width:12%;background:linear-gradient(90deg,#3a0f22,#57182f 50%,#3a0f22)}
 .stage{position:absolute;bottom:14%;left:14%;right:14%;height:10%;background:radial-gradient(60% 100% at 50% 0,#241019,#160810);border-radius:50%}
 .pole{position:absolute;top:8%;bottom:18%;left:50%;width:16px;transform:translateX(-50%);background:linear-gradient(90deg,#d8d8dc,#fafafa,#9a9aa0);border-radius:8px}
 .fig{position:absolute;bottom:24%;left:50%;transform:translateX(-72%) scaleX(-1);font-size:520px;line-height:1;filter:brightness(.15) drop-shadow(0 0 60px rgba(255,120,160,.45))}""",
 scene="""<div class="spot"></div>
 <div class="curtain" style="left:0"></div><div class="curtain" style="right:0"></div>
 <div class="pole"></div><div class="fig">💃</div><div class="stage"></div>
 <div class="cap" style="bottom:9%;font-size:46px">class tonight 🖤</div>"""),
}

def render(fid, spec):
    n, on = spec["nbars"]
    html = CHROME_FRAME.format(bg=spec["bg"], av=spec["av"], extra=spec["extra"], scene=spec["scene"],
                               bars=bars(n, on), name=spec["name"], age=spec["age"])
    with tempfile.NamedTemporaryFile("w", suffix=".html", delete=False, encoding="utf-8") as f:
        f.write(html); path = f.name
    subprocess.run([CH, "--headless=new", "--disable-gpu", "--no-sandbox", "--hide-scrollbars",
                    "--window-size=1080,1920", "--virtual-time-budget=2500",
                    f"--screenshot={OUT}/{fid}.png", f"file://{path}"],
                   capture_output=True, timeout=60)
    os.unlink(path)
    print(fid, "rendered")

NAMES = {"F01":"Slice-of-life clip","F02":"Analog text post","F03":"Meme repost","F04":"Aesthetic B-roll",
         "F05":"Recurring prop","F06":"BTS operator flex","F07":"Candid spice"}

def contact_sheet():
    cells = "".join(
        f'<figure><img src="{OUT}/{fid}.png"><figcaption><b>{fid}</b> · {NAMES[fid]}</figcaption></figure>'
        for fid in FRAMES)
    html = f"""<!doctype html><html><head><meta charset="utf-8"><style>
    body{{margin:0;width:2600px;background:#101014;font-family:-apple-system,sans-serif;padding:70px}}
    h1{{color:#fff;font-size:64px;margin:0 0 8px}} p{{color:#9a9aa2;font-size:30px;margin:0 0 50px}}
    .g{{display:grid;grid-template-columns:repeat(4,1fr);gap:44px}}
    figure{{margin:0}} img{{width:100%;border-radius:28px;display:block}}
    figcaption{{color:#e6e6ea;font-size:30px;margin-top:18px}} figcaption b{{color:#7ab8ff}}
    </style></head><body><h1>Close Friends story formats</h1>
    <p>Seven story shapes — original mockups with a placeholder persona. The creator's niche supplies the flavor.</p>
    <div class="g">{cells}</div></body></html>"""
    with tempfile.NamedTemporaryFile("w", suffix=".html", delete=False, encoding="utf-8") as f:
        f.write(html); path = f.name
    subprocess.run([CH, "--headless=new", "--disable-gpu", "--no-sandbox", "--hide-scrollbars",
                    "--window-size=2740,2600", "--virtual-time-budget=4000",
                    f"--screenshot={OUT}/contact-sheet.png", f"file://{path}"],
                   capture_output=True, timeout=60)
    os.unlink(path)
    print("contact-sheet rendered")

if __name__ == "__main__":
    for fid, spec in FRAMES.items():
        render(fid, spec)
    contact_sheet()
