"use client";
import { useState } from "react";

export default function AdminLogin() {
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (res.ok) window.location.reload();
    else setErr("wrong password");
  }

  return (
    <div className="lock">
      <form className="cover" onSubmit={submit}>
        <img className="brand-logo" src="/altr-logo.png" alt="ALTR" />
        <p className="over">The Weekly Edit</p>
        <h1>Manager access</h1>
        <p className="issue-line">team only</p>
        <input type="password" placeholder="admin password" aria-label="admin password"
          value={password} onChange={(e) => setPassword(e.target.value)} autoFocus />
        <div className="err">{err}</div>
        <button type="submit">Sign in</button>
      </form>
    </div>
  );
}
