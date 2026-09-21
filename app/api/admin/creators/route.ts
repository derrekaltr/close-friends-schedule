import { NextRequest, NextResponse } from "next/server";
import { q, newToken } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-guard";

const NICHE_KEYS = ["clean-girl", "gym-girl", "soft-luxury", "girl-next-door", "alt-edgy", "glam-baddie", "country-outdoors", "wellness-itgirl"];

export async function POST(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  const b = await req.json().catch(() => null);
  if (!b?.name || !b?.niche || !NICHE_KEYS.includes(b.niche)) {
    return NextResponse.json({ ok: false, error: "name and a valid niche are required" }, { status: 400 });
  }
  const slug = (b.slug || b.name).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const secondary = b.secondary_niche && NICHE_KEYS.includes(b.secondary_niche) ? b.secondary_niche : null;

  const rows = await q(
    `INSERT INTO creators (slug,name,ig_handle,email,gmail,token,niche,secondary_niche,aesthetic_notes,posting_notes,goals)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
     ON CONFLICT (slug) DO UPDATE SET
       name=EXCLUDED.name, ig_handle=EXCLUDED.ig_handle, email=EXCLUDED.email, gmail=EXCLUDED.gmail,
       niche=EXCLUDED.niche, secondary_niche=EXCLUDED.secondary_niche,
       aesthetic_notes=EXCLUDED.aesthetic_notes, posting_notes=EXCLUDED.posting_notes, goals=EXCLUDED.goals,
       token=COALESCE(creators.token, EXCLUDED.token)
     RETURNING token`,
    [slug, b.name, (b.ig_handle || "").replace(/^@/, ""), b.email || "", b.gmail || "", newToken(),
     b.niche, secondary, b.aesthetic_notes || "", b.posting_notes || "", b.goals || ""]
  );
  return NextResponse.json({ ok: true, slug, token: rows[0]?.token });
}

export async function DELETE(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  const slug = req.nextUrl.searchParams.get("slug");
  if (!slug) return NextResponse.json({ ok: false }, { status: 400 });
  await q("DELETE FROM creators WHERE slug = $1", [slug]);
  return NextResponse.json({ ok: true });
}
