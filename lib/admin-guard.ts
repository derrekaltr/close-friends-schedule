import { NextRequest, NextResponse } from "next/server";
import { verify, ADMIN_COOKIE } from "@/lib/auth";

export function requireAdmin(req: NextRequest): NextResponse | null {
  if (verify("admin", req.cookies.get(ADMIN_COOKIE)?.value)) return null;
  return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
}
