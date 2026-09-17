import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { getCreator } from "@/lib/db";
import { verify, creatorCookie } from "@/lib/auth";
import { buildPlan, NICHES, MONTHS, STICKER_LABELS, isoWeek } from "@/lib/plan";
import LockForm from "./LockForm";
import IssueDashboard from "./IssueDashboard";

export const dynamic = "force-dynamic";

const DAY_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default async function CreatorPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const creator = await getCreator(slug);
  if (!creator) notFound();

  const jar = await cookies();
  const unlocked = verify(`g:${creator.slug}`, jar.get(creatorCookie(creator.slug))?.value);
  const { week, year } = isoWeek();
  if (!unlocked) {
    return <LockForm slug={creator.slug} firstName={creator.name.split(" ")[0]} week={week} year={year} />;
  }

  const plan = buildPlan(creator as any);
  const n = NICHES[creator.niche] ?? { name: creator.niche, description: "", aesthetic: "", peer_watchlist_note: "" };
  const n2 = creator.secondary_niche ? NICHES[creator.secondary_niche] : null;
  const range = `${MONTHS[plan.days[0].date.getUTCMonth()]} ${plan.days[0].date.getUTCDate()} – ${MONTHS[plan.days[6].date.getUTCMonth()]} ${plan.days[6].date.getUTCDate()}`;

  const now = new Date();
  const todayIdx = (now.getUTCDay() + 6) % 7; // Monday = 0

  const days = plan.days.map((d, i) => ({
    name: d.name,
    short: DAY_SHORT[i],
    num: d.date.getUTCDate(),
    month: MONTHS[d.date.getUTCMonth()],
    items: d.items.map((s: any) => ({
      id: s.id, title: s.title, film: s.film ?? s.prompt, caption: s.caption, emoji: s.emoji,
      format: s.format ?? "photo", time: s.time, fresh: Boolean(s.fresh),
      stickerLabel: STICKER_LABELS[s.sticker] ?? null, sticker_text: s.sticker_text,
    })),
  }));

  return (
    <IssueDashboard
      slug={creator.slug}
      name={creator.name}
      week={plan.week}
      year={plan.year}
      range={range}
      nicheLabel={`${n.name}${n2 ? ` × ${n2.name}` : ""}`}
      days={days}
      todayIdx={todayIdx}
      reels={JSON.parse(JSON.stringify(plan.reels))}
      features={JSON.parse(JSON.stringify(plan.features))}
      laneName={n.name}
      laneDesc={n.description}
      laneAes={n.aesthetic}
      laneWatch={n.peer_watchlist_note}
      aestheticNotes={creator.aesthetic_notes || undefined}
      goals={creator.goals || undefined}
    />
  );
}
