import { NextRequest, NextResponse } from "next/server";
import { q } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-guard";
import { isoWeek } from "@/lib/plan";

export async function POST(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  const b = await req.json().catch(() => null);
  if (!b?.url || !b?.title || !b?.niche) {
    return NextResponse.json({ ok: false, error: "url, title and niche are required" }, { status: 400 });
  }
  let url: URL;
  try { url = new URL(String(b.url)); } catch {
    return NextResponse.json({ ok: false, error: "that url doesn't look valid" }, { status: 400 });
  }
  await q(
    "INSERT INTO examples (niche,url,handle,title,why,kind,week) VALUES ($1,$2,$3,$4,$5,$6,$7)",
    [b.niche, url.toString(), (b.handle || "").replace(/^@?/, "@").replace(/^@$/, ""), b.title, b.why || "", b.kind || "reel", isoWeek().key]
  );
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  const id = Number(req.nextUrl.searchParams.get("id"));
  if (!id) return NextResponse.json({ ok: false }, { status: 400 });
  await q("DELETE FROM examples WHERE id = $1", [id]);
  return NextResponse.json({ ok: true });
}
