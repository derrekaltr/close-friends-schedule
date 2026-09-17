import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { getCreator } from "@/lib/db";
import { verify, creatorCookie } from "@/lib/auth";
import { buildPlan, NICHES, MONTHS, STICKER_LABELS, isoWeek } from "@/lib/plan";
import LockForm from "./LockForm";

export const dynamic = "force-dynamic";

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

  return (
    <div className="issue">
      <header className="masthead">
        <img className="brand-logo" src="/altr-logo.png" alt="ALTR" />
        <p className="over">The Weekly Edit · private issue for</p>
        <h1>{creator.name}</h1>
        <p className="meta">
          <span>Issue {plan.week}</span>
          <span>{range}, {plan.year}</span>
          <span>{n.name}{n2 ? ` × ${n2.name}` : ""}</span>
        </p>
      </header>

      <section className="rules">
        <p>
          <strong>This week&apos;s energy:</strong> close friends is the group chat, not the feed. Nothing here is
          &quot;content&quot; — it&apos;s just your day: what you ate, what you bought, what you&apos;re watching. If a
          post feels like it&apos;s performing for an audience, save it for the main story. And the standing rule: if
          anyone asks about working together or how you&apos;re growing, be straight-up that you work with a
          team/agency. Real content never needs a cover story.
        </p>
      </section>

      <section>
        <h2><span className="no">01</span> Story schedule</h2>
        <p className="section-note">
          Each card shows roughly what the post looks like on your story. Most are one photo + a sticker, done in
          10 seconds. Captions are starting points — retype them how you&apos;d actually say it, or skip them.
        </p>
        <div className="week">
          {plan.days.map((d, i) => (
            <article key={d.name} className={`day ${i >= 5 ? "weekend" : ""}`}>
              <header className="day-head">
                <span className="day-num">{String(d.date.getUTCDate()).padStart(2, "0")}</span>
                <div>
                  <h3>{d.name}</h3>
                  <span className="day-sub">{MONTHS[d.date.getUTCMonth()]} · post 2–3, skip guilt-free if life happens</span>
                </div>
              </header>
              <ol className="slots">
                {d.items.map((s: any) => (
                  <li key={s.id}>
                    <div className="mock" aria-hidden="true">
                      <div className="mock-bar"><i /><i /><i /></div>
                      <span className="mock-emoji">{s.emoji ?? "📷"}</span>
                      <div className="mock-bottom">
                        {s.caption && <span className="mock-cap">{s.caption}</span>}
                        {STICKER_LABELS[s.sticker] && (
                          <span className="mock-pill">{s.sticker_text ?? STICKER_LABELS[s.sticker]}</span>
                        )}
                      </div>
                    </div>
                    <div className="slot-info">
                      <span className="slot-time">{s.time}</span>
                      <strong>{s.fresh && <em className="fresh">new this week </em>}{s.title}</strong>
                      <p>{s.film ?? s.prompt}</p>
                      <span className="tag fmt">{s.format ?? "photo"}</span>
                    </div>
                  </li>
                ))}
              </ol>
            </article>
          ))}
        </div>
      </section>

      <section>
        <h2><span className="no">02</span> Reels to film this week</h2>
        <p className="section-note">
          Pick two minimum. Anything marked Trial Reel goes out as a trial first — promote it to the grid only if
          non-follower reach looks good.
        </p>
        <div className="reels">
          {plan.reels.map((r: any, i: number) => (
            <article key={r.id} className="reel">
              <span className="reel-no">{String(i + 1).padStart(2, "0")}</span>
              <h3>&ldquo;{r.hook}&rdquo;</h3>
              <p>{r.concept}</p>
              <span className="tag alt">{r.feature.replace(/-/g, " ")}</span>
              {r.fresh && <span className="fresh-tag">new this week</span>}
            </article>
          ))}
        </div>
      </section>

      <section>
        <h2><span className="no">03</span> Features worth playing with</h2>
        <div className="feats">
          {plan.features.map((f: any) => (
            <div key={f.name} className="feat"><h4>{f.name}</h4><p>{f.why}</p></div>
          ))}
        </div>
      </section>

      <section className="profile">
        <h2>Your lane</h2>
        <p><strong>{n.name}.</strong> {n.description}</p>
        <p>
          <strong>Look &amp; feel:</strong> {n.aesthetic}
          {creator.aesthetic_notes ? <> · <strong>Your notes:</strong> {creator.aesthetic_notes}</> : null}
        </p>
        <p><strong>Inspiration homework:</strong> {n.peer_watchlist_note}</p>
        {creator.goals ? <p><strong>This season&apos;s goal:</strong> {creator.goals}</p> : null}
      </section>

      <footer className="colophon">
        refreshed weekly · issue {plan.week} · made for {creator.name} only — please don&apos;t share the passcode
      </footer>
    </div>
  );
}
