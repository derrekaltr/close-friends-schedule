import { createHmac, scryptSync, randomBytes, timingSafeEqual } from "node:crypto";

const SECRET = process.env.AUTH_SECRET || process.env.ADMIN_PASSWORD || "dev-secret-change-me";
const MAX_AGE_MS = 1000 * 60 * 60 * 24 * 30; // 30 days

export const ADMIN_COOKIE = "we_admin";
export const creatorCookie = (slug: string) => `we_g_${slug.replace(/[^a-z0-9-]/g, "")}`;

export function sign(subject: string): string {
  const ts = Date.now().toString(36);
  const mac = createHmac("sha256", SECRET).update(`${subject}|${ts}`).digest("base64url");
  return `${ts}.${mac}`;
}

export function verify(subject: string, token: string | undefined): boolean {
  if (!token) return false;
  const [ts, mac] = token.split(".");
  if (!ts || !mac) return false;
  const expect = createHmac("sha256", SECRET).update(`${subject}|${ts}`).digest("base64url");
  const a = Buffer.from(mac), b = Buffer.from(expect);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
  return Date.now() - parseInt(ts, 36) < MAX_AGE_MS;
}

export function hashPasscode(passcode: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(passcode.normalize("NFKC"), salt, 32).toString("hex");
  return `${salt}:${hash}`;
}

export function checkPasscode(passcode: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const candidate = scryptSync(passcode.normalize("NFKC"), salt, 32);
  const expect = Buffer.from(hash, "hex");
  return candidate.length === expect.length && timingSafeEqual(candidate, expect);
}

export function checkAdminPassword(password: string): boolean {
  const admin = process.env.ADMIN_PASSWORD || "admin-dev";
  const a = Buffer.from(password), b = Buffer.from(admin);
  return a.length === b.length && timingSafeEqual(a, b);
}

export const cookieOpts = { httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/", maxAge: MAX_AGE_MS / 1000 };
