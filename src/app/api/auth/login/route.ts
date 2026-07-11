import { NextRequest, NextResponse } from "next/server";
import { createToken, roleForEmail, SESSION_COOKIE } from "@/lib/auth";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const { email, passcode } = await req.json();
  const expected = process.env.ADMIN_PASSCODE || "medkey-admin";
  if (!email || passcode !== expected)
    return NextResponse.json({ ok: false, error: "بيانات دخول غير صحيحة" }, { status: 401 });
  const role = roleForEmail(email);
  const res = NextResponse.json({ ok: true, role });
  res.cookies.set(SESSION_COOKIE, createToken({ email, role, ts: Date.now() }),
    { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 8 });
  return res;
}
