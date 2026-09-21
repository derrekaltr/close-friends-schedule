"use client";
import { useEffect, useState } from "react";

type Item = {
  id: string; title: string; film: string; caption?: string; emoji?: string;
  format?: string; time: string; stickerLabel?: string | null; sticker_text?: string; fresh?: boolean;
  capPos?: "top" | "center" | "lower";
};
type Day = { name: string; short: string; num: number; month: string; items: Item[] };

export default function IssueDashboard(props: {
  slug: string; name: string; week: number; year: number; range: string;
  nicheLabel: string; days: Day[]; todayIdx: number;
  features: any[];
  laneName: string; laneDesc: string; laneAes: string; laneWatch: string;
  aestheticNotes?: string; goals?: string;
}) {
  const [view, setView] = useState<"calendar" | "features">("calendar");
  const [dayIdx, setDayIdx] = useState(props.todayIdx);
  const [done, setDone] = useState<Record<string, boolean>>({});
  const storeKey = `we_done_${props.slug}_${props.year}-${props.week}`;

  useEffect(() => {
    try { setDone(JSON.parse(localStorage.getItem(storeKey) || "{}")); } catch {}
  }, [storeKey]);

  function toggleDone(id: string) {
    const next = { ...done, [id]: !done[id] };
    setDone(next);
    try { localStorage.setItem(storeKey, JSON.stringify(next)); } catch {}
  }

  const day = props.days[dayIdx];
  const doneCount = props.days.flatMap((d) => d.items).filter((i) => done[i.id]).length;
  const totalCount = props.days.reduce((n, d) => n + d.items.length, 0);

  return (
    <div className="dash">
      <header className="dash-head">
        <img className="brand-logo sm" src="/altr-logo.png" alt="ALTR" />
        <div className="dash-title">
          <h1>{props.name}</h1>
          <p className="dash-meta">
            <span>Week {props.week}</span><span>{props.range}, {props.year}</span>
            <span>{props.nicheLabel}</span><span className="dash-count">{doneCount}/{totalCount} posted</span>
          </p>
        </div>
      </header>

      <nav className="dash-nav" aria-label="dashboard sections">
        <button className={view === "calendar" ? "on" : ""} onClick={() => setView("calendar")}>Calendar</button>
        <button className={view === "features" ? "on" : ""} onClick={() => setView("features")}>Features</button>
      </nav>

      {view === "calendar" && (
        <section>
          <div className="day-tabs" role="tablist" aria-label="days of the week">
            {props.days.map((d, i) => (
              <button key={d.name} role="tab" aria-selected={i === dayIdx}
                className={`day-tab ${i === dayIdx ? "on" : ""} ${i === props.todayIdx ? "today" : ""}`}
                onClick={() => setDayIdx(i)}>
                <span className="dt-name">{d.short}</span>
                <span className="dt-num">{d.num}</span>
                {d.items.every((it) => done[it.id]) && d.items.length > 0 && <span className="dt-check">✓</span>}
              </button>
            ))}
          </div>

          <div className="day-hero">
            <button className="pager" aria-label="previous day" disabled={dayIdx === 0} onClick={() => setDayIdx(dayIdx - 1)}>‹</button>
            <div className="day-hero-mid">
              <span className="dh-num">{String(day.num).padStart(2, "0")}</span>
              <div>
                <h2>{day.name}{dayIdx === props.todayIdx ? <em className="dh-today">today</em> : null}</h2>
                <p className="dh-sub">{day.month} · post 1–2 · skip guilt-free if life happens</p>
              </div>
            </div>
            <button className="pager" aria-label="next day" disabled={dayIdx === props.days.length - 1} onClick={() => setDayIdx(dayIdx + 1)}>›</button>
          </div>

          <div className="tasks">
            {day.items.map((s, i) => (
              <article key={s.id} className={`task ${done[s.id] ? "is-done" : ""}`}>
                <button className={`done-btn corner ${done[s.id] ? "on" : ""}`} onClick={() => toggleDone(s.id)}>
                  {done[s.id] ? "✓ posted" : "mark posted"}
                </button>
                <div className="task-side">
                  <span className="task-step">{i + 1}</span>
                  <div className="mock-wrap">
                    <div className="mock" aria-hidden="true">
                      <div className="mock-bar"><i /><i /><i /></div>
                      <span className={`mock-emoji ${s.capPos === "center" ? "up" : ""}`}>{s.emoji ?? "📷"}</span>
                      <div className={`mock-overlay pos-${s.capPos ?? "lower"}`}>
                        {s.caption && <span className="mock-cap">{s.caption}</span>}
                        {s.stickerLabel && <span className="mock-pill">{s.sticker_text ?? s.stickerLabel}</span>}
                      </div>
                    </div>
                    <span className="mock-note">↑ exact placement</span>
                  </div>
                </div>
                <div className="task-body">
                  <div className="task-chips">
                    <span className="chip time">{s.time}</span>
                    <span className="chip">{s.format ?? "photo"}</span>
                    {s.stickerLabel && <span className="chip">{s.stickerLabel}</span>}
                    {s.fresh && <span className="chip fresh-chip">new this week</span>}
                  </div>
                  <h3 className="task-title">{s.title}</h3>
                  <div className="task-field">
                    <span className="lbl">What to shoot</span>
                    <p>{s.film}</p>
                  </div>
                  {s.caption && (
                    <div className="task-field">
                      <span className="lbl">Caption — retype it your way</span>
                      <span className="cap">{s.caption}</span>
                    </div>
                  )}
                  {s.stickerLabel && (
                    <div className="task-field">
                      <span className="lbl">Add the sticker</span>
                      <p>{s.stickerLabel}{s.sticker_text ? ` — “${s.sticker_text}”` : ""}</p>
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {view === "features" && (
        <section>
          <h2 className="view-title">Features worth playing with</h2>
          <div className="feats">
            {props.features.map((f: any) => (
              <div key={f.name} className="feat"><h4>{f.name}</h4><p>{f.why}</p></div>
            ))}
          </div>
          <div className="profile">
            <h2>Your lane</h2>
            <p><strong>{props.laneName}.</strong> {props.laneDesc}</p>
            <p><strong>Look &amp; feel:</strong> {props.laneAes}{props.aestheticNotes ? <> · <strong>Your notes:</strong> {props.aestheticNotes}</> : null}</p>
            <p><strong>Inspiration homework:</strong> {props.laneWatch}</p>
            {props.goals ? <p><strong>This season&apos;s goal:</strong> {props.goals}</p> : null}
          </div>
          <div className="rules">
            <p>
              <strong>The register rule:</strong> close friends is the group chat, not the feed. If a post feels like
              it&apos;s performing for an audience, save it for the main story. And if anyone asks about working
              together or how you&apos;re growing, be straight-up that you work with a team/agency.
            </p>
          </div>
        </section>
      )}

      <footer className="colophon">refreshed weekly · issue {props.week} · made for {props.name} only — this link is private, please don&apos;t share it</footer>
    </div>
  );
}
