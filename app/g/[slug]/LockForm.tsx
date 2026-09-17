"use client";
import { useState } from "react";

export default function LockForm({ slug, firstName, week, year }: { slug: string; firstName: string; week: number; year: number }) {
  const [passcode, setPasscode] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(""); setBusy(true);
    const res = await fetch("/api/unlock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, passcode }),
    });
    setBusy(false);
    if (res.ok) window.location.reload();
    else setErr("that's not it, love — try again");
  }

  return (
    <div className="lock">
      <form className="cover" onSubmit={submit}>
        <p className="over">A private weekly issue for</p>
        <h1>{firstName}</h1>
        <p className="issue-line">Issue {week} · {year}</p>
        <input type="password" autoComplete="off" placeholder="passcode" aria-label="passcode"
          value={passcode} onChange={(e) => setPasscode(e.target.value)} autoFocus />
        <div className="err">{err}</div>
        <button type="submit" disabled={busy}>{busy ? "…" : "Open my week"}</button>
      </form>
    </div>
  );
}
