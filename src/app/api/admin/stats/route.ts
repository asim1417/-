import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";

export async function GET() {
  if (!(await requireRole(["ADMIN", "REVIEWER", "EDITOR"])))
    return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });
  try {
    const [questions, approved, pending, lessons, sources, chunks] = await Promise.all([
      prisma.question.count(),
      prisma.question.count({ where: { approved: true } }),
      prisma.question.count({ where: { reviewStatus: "pending" } }),
      prisma.lesson.count(),
      prisma.sourceDocument.count(),
      prisma.sourceChunk.count(),
    ]);
    return NextResponse.json({ ok: true, questions, approved, pending, lessons, sources, chunks });
  } catch {
    return NextResponse.json({ ok: false, dbReady: false });
  }
}
