import { NextRequest, NextResponse } from "next/server";
import { SYSTEM_PROMPT, personalMedicalRequest, SAFETY_REDIRECT } from "@/lib/safety";
import { retrieve, buildContext } from "@/lib/rag";

export const runtime = "nodejs";

type InMsg = { role: "user" | "assistant"; content: string };

export async function POST(req: NextRequest) {
  const { messages } = (await req.json()) as { messages: InMsg[] };
  const last = messages?.filter((m) => m.role === "user").at(-1)?.content ?? "";

  // 1) حارس السلامة: طلب طبي شخصي => إعادة توجيه دون استدعاء النموذج
  if (personalMedicalRequest(last)) {
    return NextResponse.json({ answer: SAFETY_REDIRECT, blocked: true, citations: [] });
  }

  // 2) استرجاع سياق المصادر (RAG) — يعمل مع pgvector أو بحث نصّي
  let context = "لا يوجد سياق مصادر.";
  let citations: { title: string; url: string }[] = [];
  try {
    const hits = await retrieve(last, 4);
    context = buildContext(hits);
    citations = hits.map((h) => ({ title: h.title, url: h.url }));
  } catch { /* قاعدة بيانات غير مهيّأة بعد؛ نكمل دون سياق */ }

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    return NextResponse.json({
      answer: "لتفعيل المرشد الطبي، أضِف ANTHROPIC_API_KEY في ملف .env ثم أعد التشغيل.\nالواجهة والمنهج يعملان الآن بدونه.",
      blocked: false, citations,
    });
  }

  // 3) استدعاء Anthropic Messages API
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || "claude-sonnet-5",
        max_tokens: 1024,
        system: `${SYSTEM_PROMPT}\n\n— سياق المصادر (استند إليه أولًا) —\n${context}`,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
      }),
    });
    const data = await res.json();
    const answer = Array.isArray(data?.content)
      ? data.content.filter((b: any) => b.type === "text").map((b: any) => b.text).join("\n").trim()
      : (data?.error?.message ?? "تعذّر توليد الرد.");
    return NextResponse.json({ answer, blocked: false, citations });
  } catch (e) {
    return NextResponse.json({ answer: "خطأ في الاتصال بالنموذج: " + (e as Error).message, blocked: false, citations }, { status: 502 });
  }
}
