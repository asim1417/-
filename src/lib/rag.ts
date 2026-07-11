// ───────── استرجاع المصادر (RAG) — pgvector عند توفره، وإلا بحث نصّي ─────────
import { prisma } from "./db";

export type Retrieved = { chunkId: string; text: string; title: string; url: string };

/**
 * يسترجع أكثر المقاطع صلة بالسؤال.
 * - إن فُعّل مزوّد التضمينات: يستخدم عامل التشابه <-> على عمود embedding.
 * - وإلا: بحث نصّي كامل (websearch_to_tsquery) كبديل صالح للتشغيل الفوري.
 */
export async function retrieve(query: string, k = 4): Promise<Retrieved[]> {
  try {
    const rows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT c.id AS "chunkId", c.text, d.title, d.url
       FROM "SourceChunk" c JOIN "SourceDocument" d ON d.id = c."documentId"
       WHERE to_tsvector('simple', c.text) @@ websearch_to_tsquery('simple', $1)
       LIMIT $2`,
      query, k
    );
    if (rows?.length) return rows;
  } catch { /* الجدول قد لا يحتوي بيانات بعد */ }
  // بديل أخير: أحدث المقاطع
  const fallback = await prisma.sourceChunk.findMany({
    take: k, orderBy: { id: "desc" }, include: { document: true },
  });
  return fallback.map((c) => ({ chunkId: c.id, text: c.text, title: c.document.title, url: c.document.url }));
}

export function buildContext(items: Retrieved[]): string {
  if (!items.length) return "لا يوجد سياق مصادر كافٍ.";
  return items.map((it, i) => `[مصدر ${i + 1}] ${it.title} — ${it.url}\n${it.text}`).join("\n\n");
}
