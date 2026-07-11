// ═══════════════════════════════════════════════════════════════════
//  منسّق الاستيعاب — يجلب من المصادر المفتوحة، يقطّع، يخزّن، ويحضّر للاستشهاد.
//  التشغيل:  npm run ingest            (يشغّل الحصص الافتراضية)
//            أو استدعِ ingestTopic()/ingestOpenStaxPages() برمجيًا.
// ═══════════════════════════════════════════════════════════════════
import { prisma } from "../db";
import { searchMedlinePlus } from "./medlineplus";
import { searchPubmed } from "./pubmed";
import { fetchOpenStax } from "./openstax";

/** تقطيع نصّي بسيط بحدّ ~800 حرف مع تداخل، صالح للبحث النصّي وللتضمين لاحقًا. */
export function chunk(text: string, size = 800, overlap = 120): string[] {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= size) return clean ? [clean] : [];
  const out: string[] = [];
  for (let i = 0; i < clean.length; i += size - overlap) out.push(clean.slice(i, i + size));
  return out;
}

async function store(provider: string, externalId: string, title: string, url: string, license: string | null, text: string) {
  const doc = await prisma.sourceDocument.upsert({
    where: { provider_externalId: { provider, externalId } },
    update: { title, url, license, fetchedAt: new Date() },
    create: { provider, externalId, title, url, license },
  });
  await prisma.sourceChunk.deleteMany({ where: { documentId: doc.id } });
  const parts = chunk(text);
  if (parts.length) {
    await prisma.sourceChunk.createMany({
      data: parts.map((t, i) => ({ documentId: doc.id, ordinal: i, text: t, tokens: Math.ceil(t.length / 4) })),
    });
  }
  return { doc, chunks: parts.length };
}

/** يستوعب موضوعًا تعليميًا من MedlinePlus + PubMed. */
export async function ingestTopic(topic: string) {
  let stored = 0;
  for (const d of await searchMedlinePlus(topic)) {
    const r = await store("medlineplus", d.externalId, d.title, d.url, "Public Domain (US Gov)", d.snippet || d.title);
    stored += r.chunks;
  }
  for (const d of await searchPubmed(topic)) {
    const r = await store("pubmed", d.pmid, d.title, d.url, "PubMed abstract", `${d.title}. ${d.abstract}`);
    stored += r.chunks;
  }
  return stored;
}

/** يستوعب صفحات OpenStax A&P المحددة (رخصة CC BY). */
export async function ingestOpenStaxPages(pages: { url: string; title: string; externalId: string }[]) {
  let stored = 0;
  for (const p of pages) {
    const d = await fetchOpenStax(p.url, p.title, p.externalId);
    const r = await store("openstax", p.externalId, p.title, p.url, "CC BY 4.0", d.text);
    stored += r.chunks;
  }
  return stored;
}

// حصص افتراضية تُشغَّل عبر `npm run ingest`
const DEFAULT_TOPICS = ["homeostasis", "potassium blood", "cell membrane transport", "enzymes metabolism"];
const DEFAULT_OPENSTAX = [
  { url: "https://openstax.org/books/anatomy-and-physiology-2e/pages/1-5-homeostasis", title: "OpenStax A&P — Homeostasis", externalId: "openstax-ap-homeostasis" },
  { url: "https://openstax.org/books/anatomy-and-physiology-2e/pages/3-1-the-cell-membrane", title: "OpenStax A&P — The Cell Membrane", externalId: "openstax-ap-membrane" },
];

async function main() {
  console.log("⏳ بدء الاستيعاب من المصادر المفتوحة…");
  let total = 0;
  for (const t of DEFAULT_TOPICS) {
    try { const n = await ingestTopic(t); total += n; console.log(`✔ ${t}: ${n} مقطع`); }
    catch (e) { console.warn(`⚠ تعذّر ${t}:`, (e as Error).message); }
  }
  try { const n = await ingestOpenStaxPages(DEFAULT_OPENSTAX); total += n; console.log(`✔ OpenStax: ${n} مقطع`); }
  catch (e) { console.warn("⚠ OpenStax:", (e as Error).message); }
  console.log(`✅ اكتمل. إجمالي المقاطع المخزّنة: ${total}`);
  await prisma.$disconnect();
}

// شغّل main فقط عند التنفيذ المباشر
if (process.argv[1] && process.argv[1].endsWith("ingest.ts")) {
  main().catch((e) => { console.error(e); process.exit(1); });
}
