import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { QUESTIONS } from "@/lib/curriculum";

// GET /api/questions?subject=Physiology&highYield=true[&all=true]
export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const subject = p.get("subject");
  const highYield = p.get("highYield") === "true";
  const all = p.get("all") === "true"; // لوحة الإدارة فقط
  try {
    const rows = await prisma.question.findMany({
      where: {
        ...(all ? {} : { approved: true }),          // بوابة: الطالب يرى المعتمد فقط
        ...(subject ? { subject } : {}),
        ...(highYield ? { isHighYield: true } : {}),
      },
      include: { options: true, explanation: true },
      take: 200,
    });
    return NextResponse.json({ source: "db", reviewed: !all, count: rows.length, questions: rows });
  } catch {
    // قاعدة بيانات غير مهيّأة: نعيد المنهج كمعاينة صريحة (غير مُراجَعة)
    const filtered = QUESTIONS.filter((q) => (!subject || q.subject === subject) && (!highYield || q.highYield));
    return NextResponse.json({ source: "curriculum", reviewed: false, preview: true, count: filtered.length, questions: filtered });
  }
}
