import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";

// GET /api/review  → الأسئلة قيد المراجعة
export async function GET() {
  try {
    const pending = await prisma.question.findMany({
      where: { reviewStatus: "pending" },
      include: { options: true, explanation: true },
      take: 200,
    });
    return NextResponse.json({ count: pending.length, questions: pending });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message, questions: [] }, { status: 500 });
  }
}

// POST /api/review { id, action: "approve" | "reject", notes? }
export async function POST(req: NextRequest) {
  if (!(await requireRole(["ADMIN", "REVIEWER"])))
    return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });
  const { id, action, notes } = await req.json();
  if (!id || !["approve", "reject"].includes(action))
    return NextResponse.json({ error: "id و action(approve|reject) مطلوبان" }, { status: 400 });

  const reviewer = await prisma.user.findFirst({ where: { role: { in: ["REVIEWER", "ADMIN"] } } });
  if (!reviewer) return NextResponse.json({ error: "لا يوجد مُراجع مُسجّل" }, { status: 400 });

  const approved = action === "approve";
  try {
    await prisma.question.update({
      where: { id },
      data: { approved, reviewStatus: approved ? "approved" : "rejected" },
    });
    await prisma.contentReview.create({
      data: { reviewerId: reviewer.id, questionId: id, status: approved ? "approved" : "rejected", notes },
    });
    await prisma.auditLog.create({ data: { actor: reviewer.email, action: `review:${action}`, target: id } });
    return NextResponse.json({ ok: true, id, reviewStatus: approved ? "approved" : "rejected" });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
