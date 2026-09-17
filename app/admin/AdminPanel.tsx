"use client";
import { useState } from "react";

const NICHES: Record<string, string> = {
  "clean-girl": "Clean Girl", "gym-girl": "Gym Girl", "soft-luxury": "Soft Luxury",
  "girl-next-door": "Girl Next Door", "alt-edgy": "Alt / Edgy", "glam-baddie": "Glam / Baddie",
  "country-outdoors": "Country / Outdoors", "wellness-itgirl": "Wellness It-Girl",
};

const EMPTY = { slug: "", name: "", ig_handle: "", email: "", gmail: "", passcode: "", niche: "clean-girl", secondary_niche: "", aesthetic_notes: "", posting_notes: "", goals: "" };

export default function AdminPanel({ creators, weekKey, persistent }: any) {
  const [form, setForm] = useState<any>(EMPTY);
  const [msg, setMsg] = useState("");
  const set = (k: string) => (e: any) => setForm({ ...form, [k]: e.target.value });

  async function saveCreator(e: React.FormEvent) {
    e.preventDefault();
    setMsg("saving…");
    const res = await fetch("/api/admin/creators", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
    });
    const data = await res.json();
    if (data.ok) window.location.reload();
    else setMsg(data.error || "something went wrong");
  }

  async function removeCreator(slug: string, name: string) {
    if (!confirm(`Remove ${name}? Her page stops working immediately.`)) return;
    await fetch(`/api/admin/creators?slug=${encodeURIComponent(slug)}`, { method: "DELETE" });
    window.location.reload();
  }

  return (
    <div className="admin">
      <h1>The Weekly Edit</h1>
      <p className="sub">Roster &amp; content admin · week {weekKey}</p>

      {!persistent && (
        <div className="banner">
          Database not connected yet — changes here reset on redeploys/cold starts. Connect Neon Postgres on Vercel
          (Storage tab → Neon → connect to this project) to make everything permanent.
        </div>
      )}

      <div className="panel">
        <h2>{form.slug ? `Editing ${form.name}` : "Add a girl"}</h2>
        <form onSubmit={saveCreator}>
          <div className="grid2">
            <div><label>Name</label><input value={form.name} onChange={set("name")} required /></div>
            <div><label>Instagram handle</label><input value={form.ig_handle} onChange={set("ig_handle")} placeholder="@her.handle" /></div>
            <div><label>Email</label><input value={form.email} onChange={set("email")} type="email" /></div>
            <div><label>Gmail (drive access)</label><input value={form.gmail} onChange={set("gmail")} type="email" /></div>
            <div><label>Passcode {form.slug ? "(blank = keep current)" : ""}</label><input value={form.passcode} onChange={set("passcode")} placeholder="6+ characters" /></div>
            <div><label>Niche</label>
              <select value={form.niche} onChange={set("niche")}>
                {Object.entries(NICHES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div><label>Secondary niche</label>
              <select value={form.secondary_niche} onChange={set("secondary_niche")}>
                <option value="">none</option>
                {Object.entries(NICHES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          </div>
          <div style={{ marginTop: 14 }}>
            <label>Aesthetic notes (from her profile review)</label>
            <textarea value={form.aesthetic_notes} onChange={set("aesthetic_notes")} placeholder="colors she wears, editing style, on-camera energy…" />
          </div>
          <div className="grid2" style={{ marginTop: 14 }}>
            <div><label>Posting notes / off-limits</label><textarea value={form.posting_notes} onChange={set("posting_notes")} /></div>
            <div><label>This season&apos;s goal</label><textarea value={form.goals} onChange={set("goals")} /></div>
          </div>
          <div style={{ marginTop: 18, display: "flex", gap: 12 }}>
            <button className="btn" type="submit">{form.slug ? "Save changes" : "Add her"}</button>
            {form.slug && <button className="btn ghost" type="button" onClick={() => { setForm(EMPTY); setMsg(""); }}>Cancel edit</button>}
          </div>
          <div className="msg">{msg}</div>
        </form>
        <p className="sub" style={{ marginTop: 8, marginBottom: 0 }}>
          New girl flow: add her with just name + handle + passcode, then ask Claude to review her public profile and
          fill in niche + aesthetic notes. Send her the link and passcode in separate messages.
        </p>
      </div>

      <div className="panel">
        <h2>Roster ({creators.length})</h2>
        <table className="roster">
          <thead><tr><th>Name</th><th>IG</th><th>Niche</th><th>Her page</th><th></th></tr></thead>
          <tbody>
            {creators.map((c: any) => (
              <tr key={c.slug}>
                <td><strong>{c.name}</strong><br /><span style={{ color: "var(--soft-white)", fontSize: 15 }}>{c.email}</span></td>
                <td>{c.ig_handle ? `@${c.ig_handle}` : "—"}</td>
                <td>{NICHES[c.niche] || c.niche}{c.secondary_niche ? ` × ${NICHES[c.secondary_niche]}` : ""}</td>
                <td><a href={`/g/${c.slug}`} target="_blank">/g/{c.slug}</a></td>
                <td style={{ whiteSpace: "nowrap" }}>
                  <button className="btn ghost" style={{ padding: "8px 14px", marginRight: 8 }}
                    onClick={() => { setForm({ ...c, secondary_niche: c.secondary_niche || "", passcode: "" }); window.scrollTo({ top: 0, behavior: "smooth" }); }}>
                    Edit
                  </button>
                  <button className="btn danger" onClick={() => removeCreator(c.slug, c.name)}>Remove</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  );
}
