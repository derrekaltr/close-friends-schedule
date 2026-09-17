import { NextRequest, NextResponse } from "next/server";
import { q } from "@/lib/db";
import { hashPasscode } from "@/lib/auth";
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
  const existing = await q("SELECT slug, pass_hash FROM creators WHERE slug = $1", [slug]);

  if (existing.length === 0 && !b.passcode) {
    return NextResponse.json({ ok: false, error: "a passcode is required for a new girl" }, { status: 400 });
  }
  if (b.passcode && String(b.passcode).length < 6) {
    return NextResponse.json({ ok: false, error: "passcode must be 6+ characters" }, { status: 400 });
  }
  const passHash = b.passcode ? hashPasscode(String(b.passcode)) : existing[0].pass_hash;
  const secondary = b.secondary_niche && NICHE_KEYS.includes(b.secondary_niche) ? b.secondary_niche : null;

  await q(
    `INSERT INTO creators (slug,name,ig_handle,email,gmail,pass_hash,niche,secondary_niche,aesthetic_notes,posting_notes,goals)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
     ON CONFLICT (slug) DO UPDATE SET
       name=EXCLUDED.name, ig_handle=EXCLUDED.ig_handle, email=EXCLUDED.email, gmail=EXCLUDED.gmail,
       pass_hash=EXCLUDED.pass_hash, niche=EXCLUDED.niche, secondary_niche=EXCLUDED.secondary_niche,
       aesthetic_notes=EXCLUDED.aesthetic_notes, posting_notes=EXCLUDED.posting_notes, goals=EXCLUDED.goals`,
    [slug, b.name, (b.ig_handle || "").replace(/^@/, ""), b.email || "", b.gmail || "", passHash,
     b.niche, secondary, b.aesthetic_notes || "", b.posting_notes || "", b.goals || ""]
  );
  return NextResponse.json({ ok: true, slug });
}

export async function DELETE(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  const slug = req.nextUrl.searchParams.get("slug");
  if (!slug) return NextResponse.json({ ok: false }, { status: 400 });
  await q("DELETE FROM creators WHERE slug = $1", [slug]);
  return NextResponse.json({ ok: true });
}
