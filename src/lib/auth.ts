// ═══ مصادقة وصلاحيات (RBAC) — جلسة موقّعة بـ HMAC، بلا تبعيات خارجية ═══
import crypto from "crypto";
import { cookies } from "next/headers";

export type Role = "STUDENT" | "REVIEWER" | "EDITOR" | "ADMIN";
export type Session = { email: string; role: Role; ts: number };
const COOKIE = "mk_session";
const SECRET = process.env.AUTH_SECRET || "dev-secret-change-me";
const sign = (d: string) => crypto.createHmac("sha256", SECRET).update(d).digest("base64url");

export function createToken(p: Session): string {
  const body = Buffer.from(JSON.stringify(p)).toString("base64url");
  return `${body}.${sign(body)}`;
}
export function verifyToken(token?: string): Session | null {
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || sig !== sign(body)) return null;
  try { return JSON.parse(Buffer.from(body, "base64url").toString()); } catch { return null; }
}
export const SESSION_COOKIE = COOKIE;

export async function getSession(): Promise<Session | null> {
  const c = await cookies();
  return verifyToken(c.get(COOKIE)?.value);
}
export async function requireRole(roles: Role[]): Promise<Session | null> {
  const s = await getSession();
  return s && roles.includes(s.role) ? s : null;
}
// خريطة أدوار تجريبية (تُستبدل لاحقًا بـ Auth.js + جدول users)
export function roleForEmail(email: string): Role {
  if (email.startsWith("admin@")) return "ADMIN";
  if (email.startsWith("reviewer@")) return "REVIEWER";
  if (email.startsWith("editor@")) return "EDITOR";
  return "REVIEWER"; // بوابة /admin تتطلب دورًا مؤهّلًا؛ الافتراضي مُراجع
}
