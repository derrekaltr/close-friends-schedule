/**
 * Storage layer. Uses real Postgres when DATABASE_URL is set (Neon on Vercel);
 * otherwise falls back to embedded Postgres (PGlite) — persistent in ./.data
 * for local dev, ephemeral in /tmp on Vercel until Neon is connected.
 */
import demoCreator from "@/creators/demo-girl.json";
import { hashPasscode } from "@/lib/auth";

type Row = Record<string, any>;
let pool: any = null;
let pglite: any = null;
let readiness: Promise<void> | null = null;

export function usingRealDb() {
  return Boolean(process.env.DATABASE_URL);
}

async function rawQuery(sql: string, params: any[] = []): Promise<Row[]> {
  if (process.env.DATABASE_URL) {
    if (!pool) {
      const { Pool } = await import("pg");
      pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: /localhost|127\.0\.0\.1/.test(process.env.DATABASE_URL) ? undefined : { rejectUnauthorized: false },
        max: 3,
      });
    }
    const res = await pool.query(sql, params);
    return res.rows;
  }
  if (!pglite) {
    const { PGlite } = await import("@electric-sql/pglite");
    const { mkdirSync } = await import("node:fs");
    const dir = process.env.VERCEL ? "/tmp/weekly-edit-pg" : `${process.cwd()}/.data/pg`;
    mkdirSync(dir, { recursive: true });
    pglite = new PGlite(dir);
  }
  const res = await pglite.query(sql, params);
  return res.rows;
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS creators (
  slug TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  ig_handle TEXT DEFAULT '',
  email TEXT DEFAULT '',
  gmail TEXT DEFAULT '',
  pass_hash TEXT NOT NULL,
  niche TEXT NOT NULL,
  secondary_niche TEXT,
  aesthetic_notes TEXT DEFAULT '',
  posting_notes TEXT DEFAULT '',
  goals TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE IF NOT EXISTS examples (
  id SERIAL PRIMARY KEY,
  niche TEXT NOT NULL,
  url TEXT NOT NULL,
  handle TEXT DEFAULT '',
  title TEXT NOT NULL,
  why TEXT DEFAULT '',
  kind TEXT DEFAULT 'reel',
  week TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);`;

async function ensureReady() {
  if (!readiness) {
    readiness = (async () => {
      for (const stmt of SCHEMA.split(";").map((s) => s.trim()).filter(Boolean)) {
        await rawQuery(stmt);
      }
      const [{ n }] = await rawQuery("SELECT count(*)::int AS n FROM creators");
      if (Number(n) === 0) {
        const d: any = demoCreator;
        await rawQuery(
          `INSERT INTO creators (slug,name,ig_handle,email,gmail,pass_hash,niche,secondary_niche,aesthetic_notes,posting_notes,goals)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) ON CONFLICT (slug) DO NOTHING`,
          [d.slug, d.name, d.ig_handle ?? "", d.email, d.gmail, hashPasscode(d.passcode), d.niche, d.secondary_niche, d.aesthetic_notes, d.posting_notes, d.goals]
        );
      }
    })().catch((e) => { readiness = null; throw e; });
  }
  return readiness;
}

export async function q(sql: string, params: any[] = []): Promise<Row[]> {
  await ensureReady();
  return rawQuery(sql, params);
}

export async function getCreator(slug: string) {
  const rows = await q("SELECT * FROM creators WHERE slug = $1", [slug]);
  return rows[0] ?? null;
}
