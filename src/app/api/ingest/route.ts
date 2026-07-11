import { NextRequest, NextResponse } from "next/server";
import { ingestTopic } from "@/lib/sources/ingest";

// POST /api/ingest { "topic": "homeostasis" }  — للوحة الإدارة (يفضّل حمايته بـ RBAC)
export async function POST(req: NextRequest) {
  const { topic } = await req.json();
  if (!topic) return NextResponse.json({ error: "topic مطلوب" }, { status: 400 });
  try {
    const chunks = await ingestTopic(topic);
    return NextResponse.json({ ok: true, topic, chunks });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 502 });
  }
}
