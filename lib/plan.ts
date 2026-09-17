import nichesData from "@/data/niches.json";
import library from "@/data/content-library.json";
import weeklyFiles from "@/data/weekly";

export const NICHES: Record<string, any> = (nichesData as any).niches;

export function isoWeek(d = new Date()) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((date as any) - (yearStart as any)) / 86400000 + 1) / 7);
  return { year: date.getUTCFullYear(), week, key: `${date.getUTCFullYear()}-${String(week).padStart(2, "0")}` };
}

function weekDates(year: number, week: number) {
  const simple = new Date(Date.UTC(year, 0, 1 + (week - 1) * 7));
  const dow = simple.getUTCDay() || 7;
  simple.setUTCDate(simple.getUTCDate() - dow + 1);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(simple);
    d.setUTCDate(d.getUTCDate() + i);
    return d;
  });
}

function hashStr(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function mulberry32(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function shuffled<T>(arr: T[], rng: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const TIME_ORDER: Record<string, number> = { morning: 0, midday: 1, evening: 2, night: 3, any: 1.5 };
export const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
export const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export const STICKER_LABELS: Record<string, string | null> = {
  poll: "poll", question: "question box", slider: "slider", reveal: "reveal sticker",
  frames: "frames sticker", cutout: "cutout", "add-yours": "add yours", "add-yours-music": "add yours · music",
  "story-comments": "comments on", none: null,
};

export function buildPlan(creator: { slug: string; niche: string; secondary_niche?: string | null }) {
  const { year, week, key } = isoWeek();
  const fresh = (weeklyFiles as any)[key] ?? { stories: [], reels: [], features_to_try: [] };
  const markFresh = (arr: any[]) => (arr ?? []).map((x) => ({ ...x, fresh: true }));

  const allStories = [...markFresh(fresh.stories), ...(library as any).stories];
  const allReels = [...markFresh(fresh.reels), ...(library as any).reels];
  const allFeatures = [...(fresh.features_to_try ?? []), ...(library as any).features_to_try];

  const rng = mulberry32(hashStr(`${creator.slug}::${key}`));
  const myNiches = [creator.niche, creator.secondary_niche].filter(Boolean) as string[];
  const fits = (item: any) => item.niches.includes("*") || item.niches.some((n: string) => myNiches.includes(n));

  const stories = shuffled(allStories.filter(fits), rng);
  stories.sort((a, b) => (b.fresh ? 1 : 0) - (a.fresh ? 1 : 0));

  const days = weekDates(year, week).map((date, i) => {
    const items = stories.slice(i * 3, i * 3 + 3);
    items.sort((a, b) => (TIME_ORDER[a.time] ?? 1.5) - (TIME_ORDER[b.time] ?? 1.5));
    return { name: DAY_NAMES[i], date, items };
  });

  const reels = shuffled(allReels.filter(fits), rng);
  reels.sort((a, b) => (b.fresh ? 1 : 0) - (a.fresh ? 1 : 0));

  const featStart = (week * 3) % allFeatures.length;
  const features = Array.from({ length: 3 }, (_, i) => allFeatures[(featStart + i) % allFeatures.length]);

  return { year, week, key, days, reels: reels.slice(0, 4), features, myNiches };
}
