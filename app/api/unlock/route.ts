import { NextRequest, NextResponse } from "next/server";
import { getCreator } from "@/lib/db";
import { checkPasscode, sign, creatorCookie, cookieOpts } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { slug, passcode } = await req.json().catch(() => ({}));
  if (!slug || !passcode) return NextResponse.json({ ok: false }, { status: 400 });
  const creator = await getCreator(String(slug));
  // small constant-ish delay to blunt guessing
  await new Promise((r) => setTimeout(r, 300));
  if (!creator || !checkPasscode(String(passcode), creator.pass_hash)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(creatorCookie(creator.slug), sign(`g:${creator.slug}`), cookieOpts);
  return res;
}
