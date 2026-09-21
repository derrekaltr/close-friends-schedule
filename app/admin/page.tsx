import { cookies } from "next/headers";
import { q, usingRealDb } from "@/lib/db";
import { verify, ADMIN_COOKIE } from "@/lib/auth";
import { isoWeek } from "@/lib/plan";
import AdminPanel from "./AdminPanel";
import AdminLogin from "./AdminLogin";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const jar = await cookies();
  if (!verify("admin", jar.get(ADMIN_COOKIE)?.value)) return <AdminLogin />;

  const creators = await q(
    "SELECT slug,name,ig_handle,email,gmail,token,niche,secondary_niche,aesthetic_notes,posting_notes,goals FROM creators ORDER BY name"
  );

  return (
    <AdminPanel
      creators={JSON.parse(JSON.stringify(creators))}
      weekKey={isoWeek().key}
      persistent={usingRealDb() || !process.env.VERCEL}
    />
  );
}
