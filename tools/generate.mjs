#!/usr/bin/env node
/**
 * generate.mjs — builds one passcode-locked weekly dashboard per creator.
 *
 * Usage:   node tools/generate.mjs [--week YYYY-WW]
 * Input:   creators/*.json  +  data/niches.json  +  data/content-library.json
 *          optional data/weekly/<YYYY-WW>.json (fresh research from the weekly refresh)
 * Output:  site/<slug>/index.html  (AES-256-GCM encrypted with her passcode)
 *
 * The dashboard content is truly encrypted — without the passcode the HTML
 * contains only ciphertext. Passcodes can also come from the env var
 * PASSCODE_<SLUG> (dashes → underscores, uppercased) to keep them out of git.
 */
import { readFileSync, readdirSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { pbkdf2Sync, randomBytes, createCipheriv } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PBKDF2_ITERS = 200_000;

// ---------- helpers ----------
function isoWeek(d = new Date()) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((date - yearStart) / 86400000 + 1) / 7);
  return { year: date.getUTCFullYear(), week };
}
function weekDates(year, week) {
  // Monday of the given ISO week
  const simple = new Date(Date.UTC(year, 0, 1 + (week - 1) * 7));
  const dow = simple.getUTCDay() || 7;
  simple.setUTCDate(simple.getUTCDate() - dow + 1);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(simple);
    d.setUTCDate(d.getUTCDate() + i);
    return d;
  });
}
function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function mulberry32(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function shuffled(arr, rng) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// ---------- load ----------
const niches = JSON.parse(readFileSync(join(ROOT, "data/niches.json"), "utf8")).niches;
const library = JSON.parse(readFileSync(join(ROOT, "data/content-library.json"), "utf8"));

const argWeek = process.argv.indexOf("--week");
let { year, week } = isoWeek();
if (argWeek !== -1) [year, week] = process.argv[argWeek + 1].split("-W").join("-").split("-").map(Number);
const weekKey = `${year}-${String(week).padStart(2, "0")}`;

// merge in this week's fresh research, if the weekly refresh has run
const weeklyPath = join(ROOT, `data/weekly/${weekKey}.json`);
let fresh = { stories: [], reels: [], features_to_try: [] };
if (existsSync(weeklyPath)) {
  const w = JSON.parse(readFileSync(weeklyPath, "utf8"));
  fresh = { stories: w.stories ?? [], reels: w.reels ?? [], features_to_try: w.features_to_try ?? [] };
  fresh.stories.forEach((s) => (s.fresh = true));
  fresh.reels.forEach((r) => (r.fresh = true));
}
const allStories = [...fresh.stories, ...library.stories];
const allReels = [...fresh.reels, ...library.reels];
const allFeatures = [...fresh.features_to_try, ...library.features_to_try];

const TIME_ORDER = { morning: 0, midday: 1, evening: 2, night: 3, any: 1.5 };
const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// ---------- plan builder ----------
function buildPlan(creator) {
  const rng = mulberry32(hashStr(`${creator.slug}::${weekKey}`));
  const myNiches = [creator.niche, creator.secondary_niche].filter(Boolean);
  const fits = (item) => item.niches.includes("*") || item.niches.some((n) => myNiches.includes(n));

  const stories = shuffled(allStories.filter(fits), rng);
  // fresh items first so weekly research always lands on the board
  stories.sort((a, b) => (b.fresh ? 1 : 0) - (a.fresh ? 1 : 0));

  const days = weekDates(year, week).map((date, i) => {
    const slice = stories.slice(i * 3, i * 3 + 3);
    slice.sort((a, b) => (TIME_ORDER[a.time] ?? 1.5) - (TIME_ORDER[b.time] ?? 1.5));
    return { name: DAY_NAMES[i], date, items: slice };
  });

  const reels = shuffled(allReels.filter(fits), rng);
  reels.sort((a, b) => (b.fresh ? 1 : 0) - (a.fresh ? 1 : 0));

  const featStart = (week * 3) % allFeatures.length;
  const features = Array.from({ length: 3 }, (_, i) => allFeatures[(featStart + i) % allFeatures.length]);

  return { days, reels: reels.slice(0, 4), features };
}

// ---------- render ----------
const STICKER_LABELS = {
  poll: "poll", question: "question box", slider: "slider", reveal: "reveal sticker",
  frames: "frames sticker", cutout: "cutout", "add-yours": "add yours", "add-yours-music": "add yours · music",
  "story-comments": "comments on", none: null,
};

function renderInner(creator, plan) {
  const n = niches[creator.niche] ?? { name: creator.niche, description: "", aesthetic: "", peer_watchlist_note: "" };
  const n2 = creator.secondary_niche ? niches[creator.secondary_niche] : null;
  const range = `${MONTHS[plan.days[0].date.getUTCMonth()]} ${plan.days[0].date.getUTCDate()} – ${MONTHS[plan.days[6].date.getUTCMonth()]} ${plan.days[6].date.getUTCDate()}`;

  const dayCards = plan.days.map((d, i) => `
    <article class="day ${i >= 5 ? "weekend" : ""}" style="--i:${i}">
      <header class="day-head">
        <span class="day-num">${String(d.date.getUTCDate()).padStart(2, "0")}</span>
        <div><h3>${d.name}</h3><span class="day-sub">${MONTHS[d.date.getUTCMonth()]} · post 2–3, skip guilt-free if life happens</span></div>
      </header>
      <ol class="slots">${d.items.map((s) => `
        <li>
          <span class="slot-time">${esc(s.time)}</span>
          <div>
            <strong>${s.fresh ? '<em class="fresh">new this week</em> ' : ""}${esc(s.title)}</strong>
            <p>${esc(s.prompt)}</p>
            ${STICKER_LABELS[s.sticker] ? `<span class="tag">${esc(STICKER_LABELS[s.sticker])}</span>` : ""}
          </div>
        </li>`).join("")}
      </ol>
    </article>`).join("");

  const reelCards = plan.reels.map((r, i) => `
    <article class="reel" style="--i:${i}">
      <span class="reel-no">${String(i + 1).padStart(2, "0")}</span>
      <h3>“${esc(r.hook)}”</h3>
      <p>${esc(r.concept)}</p>
      <span class="tag alt">${esc(r.feature.replace(/-/g, " "))}</span>${r.fresh ? '<span class="tag fresh-tag">new this week</span>' : ""}
    </article>`).join("");

  const featureRows = plan.features.map((f) => `
    <div class="feat"><h4>${esc(f.name)}</h4><p>${esc(f.why)}</p></div>`).join("");

  return `
  <div class="issue">
    <header class="masthead">
      <p class="over">The Weekly Edit · private issue for</p>
      <h1>${esc(creator.name)}</h1>
      <p class="meta"><span>Issue ${week}</span><span>${range}, ${year}</span><span>${esc(n.name)}${n2 ? " × " + esc(n2.name) : ""}</span></p>
    </header>

    <section class="rules">
      <p><strong>This week's energy:</strong> your close friends story is the group chat, not the billboard. Real meals, real errands, real opinions — lower polish than the grid, more personality. And the standing rule: if anyone asks about working together or how you're growing, be straight-up that you work with a team/agency. Real content never needs a cover story.</p>
    </section>

    <section>
      <h2><span>01</span> Story schedule</h2>
      <div class="week">${dayCards}</div>
    </section>

    <section>
      <h2><span>02</span> Reels to film this week</h2>
      <p class="section-note">Pick two minimum. Anything marked Trial Reel goes out as a trial first — promote it to the grid only if non-follower reach looks good.</p>
      <div class="reels">${reelCards}</div>
    </section>

    <section>
      <h2><span>03</span> Features worth playing with</h2>
      <div class="feats">${featureRows}</div>
    </section>

    <section class="profile">
      <h2><span>04</span> Your lane</h2>
      <p class="lane-desc"><strong>${esc(n.name)}.</strong> ${esc(n.description)}</p>
      <p class="lane-aes"><strong>Look &amp; feel:</strong> ${esc(n.aesthetic)}${creator.aesthetic_notes ? ` · <strong>Your notes:</strong> ${esc(creator.aesthetic_notes)}` : ""}</p>
      <p class="lane-watch"><strong>Inspiration homework:</strong> ${esc(n.peer_watchlist_note)}</p>
      ${creator.goals ? `<p class="lane-goal"><strong>This season's goal:</strong> ${esc(creator.goals)}</p>` : ""}
    </section>

    <footer class="colophon">refreshed weekly · issue ${week} · made for ${esc(creator.name)} only — please don't share the passcode</footer>
  </div>`;
}

// ---------- styles (shared by lock screen + issue) ----------
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght,SOFT@0,9..144,300..700,50;1,9..144,300..700,50&family=Karla:ital,wght@0,300..700;1,300..700&display=swap');
:root{--paper:#faf4ec;--ink:#33232a;--blush:#efd9d3;--accent:#c4452f;--gold:#b98a4a;--soft:#8c6f77}
*{margin:0;padding:0;box-sizing:border-box}
html{scroll-behavior:smooth}
body{background:var(--paper);color:var(--ink);font-family:Karla,sans-serif;font-size:16px;line-height:1.55;-webkit-font-smoothing:antialiased}
body::before{content:"";position:fixed;inset:0;pointer-events:none;opacity:.5;z-index:9;
  background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2'/%3E%3CfeColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 .04 0'/%3E%3C/filter%3E%3Crect width='120' height='120' filter='url(%23n)'/%3E%3C/svg%3E")}
h1,h2,h3,.day-num,.reel-no{font-family:Fraunces,serif}
/* lock screen */
.lock{min-height:100svh;display:grid;place-items:center;padding:24px;
  background:radial-gradient(120% 90% at 70% 10%,var(--blush) 0%,var(--paper) 55%)}
.cover{max-width:420px;width:100%;text-align:center;border:1.5px solid var(--ink);padding:56px 36px 44px;position:relative;background:var(--paper);box-shadow:10px 10px 0 var(--blush)}
.cover::before{content:"";position:absolute;inset:8px;border:1px solid color-mix(in srgb,var(--ink) 30%,transparent);pointer-events:none}
.cover .over{font-size:11px;letter-spacing:.32em;text-transform:uppercase;color:var(--soft)}
.cover h1{font-size:clamp(34px,8vw,46px);font-weight:400;font-style:italic;margin:14px 0 4px}
.cover .issue-line{font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:var(--accent);margin-bottom:36px}
.cover input{width:100%;border:none;border-bottom:1.5px solid var(--ink);background:transparent;padding:10px 4px;font:inherit;font-size:18px;text-align:center;letter-spacing:.3em;outline:none}
.cover input:focus{border-color:var(--accent)}
.cover button{margin-top:22px;border:1.5px solid var(--ink);background:var(--ink);color:var(--paper);font:inherit;font-size:12px;letter-spacing:.28em;text-transform:uppercase;padding:13px 34px;cursor:pointer;transition:.25s}
.cover button:hover{background:var(--accent);border-color:var(--accent)}
.cover .err{color:var(--accent);font-size:13px;min-height:20px;margin-top:14px;font-style:italic}
/* issue */
.issue{max-width:1060px;margin:0 auto;padding:64px 28px 90px;animation:rise .7s ease both}
@keyframes rise{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
.masthead{text-align:center;padding-bottom:34px;border-bottom:1.5px solid var(--ink);margin-bottom:26px}
.masthead .over{font-size:11px;letter-spacing:.34em;text-transform:uppercase;color:var(--soft)}
.masthead h1{font-size:clamp(44px,9vw,84px);font-weight:380;font-style:italic;line-height:1.02;margin:10px 0 16px}
.masthead .meta{display:flex;gap:0;justify-content:center;flex-wrap:wrap;font-size:12px;letter-spacing:.16em;text-transform:uppercase}
.masthead .meta span{padding:0 16px;border-right:1px solid var(--soft)}
.masthead .meta span:last-child{border:none;color:var(--accent)}
.rules{background:var(--blush);padding:20px 26px;font-size:15px;margin-bottom:56px;position:relative}
.rules::after{content:"♡";position:absolute;top:-13px;right:22px;background:var(--paper);padding:0 8px;color:var(--accent);font-size:18px}
section h2{font-size:clamp(26px,4vw,36px);font-weight:430;margin:0 0 18px;display:flex;align-items:baseline;gap:14px}
section h2 span{font-size:13px;color:var(--accent);letter-spacing:.2em;font-family:Karla,sans-serif}
.section-note{font-size:14px;color:var(--soft);margin:-8px 0 18px;font-style:italic}
.week{display:grid;grid-template-columns:repeat(auto-fit,minmax(290px,1fr));gap:1px;background:var(--ink);border:1.5px solid var(--ink);margin-bottom:64px}
.day{background:var(--paper);padding:22px;animation:rise .6s ease both;animation-delay:calc(var(--i)*60ms)}
.day.weekend{background:color-mix(in srgb,var(--blush) 45%,var(--paper))}
.day-head{display:flex;gap:14px;align-items:baseline;border-bottom:1px dashed var(--soft);padding-bottom:10px;margin-bottom:14px}
.day-num{font-size:44px;font-weight:340;font-style:italic;color:var(--accent);line-height:1}
.day-head h3{font-size:19px;font-weight:560}
.day-sub{font-size:11.5px;color:var(--soft)}
.slots{list-style:none}
.slots li{display:flex;gap:12px;padding:10px 0;border-bottom:1px solid color-mix(in srgb,var(--ink) 10%,transparent)}
.slots li:last-child{border:none}
.slot-time{font-size:10.5px;letter-spacing:.14em;text-transform:uppercase;color:var(--gold);min-width:56px;padding-top:4px}
.slots strong{font-size:15px;font-weight:640}
.slots p{font-size:13.5px;color:color-mix(in srgb,var(--ink) 78%,transparent);margin:2px 0 6px}
.tag{display:inline-block;font-size:10.5px;letter-spacing:.12em;text-transform:uppercase;border:1px solid var(--gold);color:var(--gold);padding:2px 9px;border-radius:99px}
.tag.alt{border-color:var(--accent);color:var(--accent)}
.fresh,.fresh-tag{color:var(--accent);font-style:normal;font-size:11px;letter-spacing:.1em;text-transform:uppercase}
.fresh-tag{border:1px solid var(--accent);padding:2px 9px;border-radius:99px;margin-left:6px}
.reels{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:18px;margin-bottom:64px}
.reel{border:1.5px solid var(--ink);padding:24px 20px 20px;position:relative;background:var(--paper);transition:.25s;animation:rise .6s ease both;animation-delay:calc(var(--i)*80ms)}
.reel:hover{transform:translate(-4px,-4px);box-shadow:6px 6px 0 var(--blush)}
.reel-no{position:absolute;top:-14px;left:16px;background:var(--paper);padding:0 8px;font-style:italic;font-size:20px;color:var(--accent)}
.reel h3{font-size:19px;font-weight:480;font-style:italic;margin-bottom:8px}
.reel p{font-size:13.5px;margin-bottom:14px;color:color-mix(in srgb,var(--ink) 80%,transparent)}
.feats{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:1px;background:var(--ink);border:1.5px solid var(--ink);margin-bottom:64px}
.feat{background:var(--paper);padding:20px}
.feat h4{font-size:14px;letter-spacing:.08em;text-transform:uppercase;color:var(--accent);margin-bottom:6px}
.feat p{font-size:13.5px}
.profile{background:var(--ink);color:var(--paper);padding:34px 30px;margin-bottom:40px}
.profile h2{color:var(--paper)}
.profile p{margin-bottom:12px;font-size:15px}
.profile strong{color:var(--blush)}
.colophon{text-align:center;font-size:11px;letter-spacing:.22em;text-transform:uppercase;color:var(--soft)}
@media(max-width:640px){.issue{padding:40px 16px 70px}.week,.feats{border-width:1px}}
`;

// ---------- shell + encryption ----------
function encrypt(passcode, plaintext) {
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const key = pbkdf2Sync(passcode.normalize("NFKC"), salt, PBKDF2_ITERS, 32, "sha256");
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final(), cipher.getAuthTag()]);
  return Buffer.concat([salt, iv, ct]).toString("base64");
}

function renderShell(creator, payload) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>The Weekly Edit — ${esc(creator.name)}</title>
<style>${CSS}</style>
</head>
<body>
<div class="lock" id="lock">
  <form class="cover" id="form">
    <p class="over">A private weekly issue for</p>
    <h1>${esc(creator.name.split(" ")[0])}</h1>
    <p class="issue-line">Issue ${week} · ${year}</p>
    <input id="pass" type="password" inputmode="text" autocomplete="off" placeholder="passcode" aria-label="passcode" autofocus>
    <div class="err" id="err"></div>
    <button type="submit">Open my week</button>
  </form>
</div>
<div id="content"></div>
<script>
const PAYLOAD="${payload}",ITERS=${PBKDF2_ITERS};
const b=Uint8Array.from(atob(PAYLOAD),c=>c.charCodeAt(0));
const salt=b.slice(0,16),iv=b.slice(16,28),data=b.slice(28);
document.getElementById("form").addEventListener("submit",async e=>{
  e.preventDefault();
  const err=document.getElementById("err");err.textContent="";
  const pass=document.getElementById("pass").value.normalize("NFKC");
  try{
    const km=await crypto.subtle.importKey("raw",new TextEncoder().encode(pass),"PBKDF2",false,["deriveKey"]);
    const key=await crypto.subtle.deriveKey({name:"PBKDF2",salt,iterations:ITERS,hash:"SHA-256"},km,{name:"AES-GCM",length:256},false,["decrypt"]);
    const pt=await crypto.subtle.decrypt({name:"AES-GCM",iv},key,data);
    document.getElementById("content").innerHTML=new TextDecoder().decode(pt);
    document.getElementById("lock").remove();
  }catch{err.textContent="that's not it, love — try again";}
});
</script>
</body>
</html>`;
}

// ---------- main ----------
const creatorFiles = readdirSync(join(ROOT, "creators")).filter((f) => f.endsWith(".json") && !f.startsWith("_"));
if (creatorFiles.length === 0) { console.error("No creator profiles in creators/ — copy _template.json to get started."); process.exit(1); }

for (const file of creatorFiles) {
  const creator = JSON.parse(readFileSync(join(ROOT, "creators", file), "utf8"));
  const envPass = process.env[`PASSCODE_${creator.slug.toUpperCase().replace(/-/g, "_")}`];
  const passcode = envPass || creator.passcode;
  if (!passcode) { console.warn(`skip ${creator.slug}: no passcode (set in JSON or PASSCODE_${creator.slug.toUpperCase().replace(/-/g, "_")})`); continue; }

  const plan = buildPlan(creator);
  const inner = renderInner(creator, plan);
  const html = renderShell(creator, encrypt(passcode, inner));
  const outDir = join(ROOT, "site", creator.slug);
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "index.html"), html);
  console.log(`✓ ${creator.slug} → site/${creator.slug}/index.html  (week ${weekKey}${existsSync(weeklyPath) ? ", with fresh research" : ""})`);
}
console.log("\nDone. Share each girl's link + passcode privately (not in the same message).");
