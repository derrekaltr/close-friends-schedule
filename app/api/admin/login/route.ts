import { NextRequest, NextResponse } from "next/server";
import { checkAdminPassword, sign, ADMIN_COOKIE, cookieOpts } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { password } = await req.json().catch(() => ({}));
  await new Promise((r) => setTimeout(r, 300));
  if (!password || !checkAdminPassword(String(password))) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, sign("admin"), cookieOpts);
  return res;
}
