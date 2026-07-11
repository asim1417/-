// ───────── MedlinePlus — NLM Web Service (بيانات حكومية أمريكية عامة) ─────────
// المرجع: https://medlineplus.gov/about/developers/webservices/
const BASE = "https://wsearch.nlm.nih.gov/ws/query";
const UA = `MiftahAlTibb/0.1 (${process.env.CONTACT_EMAIL || "platform@miftah.example"})`;

export type MedlineDoc = { title: string; url: string; snippet: string; externalId: string };

/** يبحث في مواضيع MedlinePlus الصحية ويعيد نتائج نصّية مبسّطة. */
export async function searchMedlinePlus(term: string, max = 5): Promise<MedlineDoc[]> {
  const url = `${BASE}?db=healthTopics&term=${encodeURIComponent(term)}&retmax=${max}`;
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`MedlinePlus ${res.status}`);
  const xml = await res.text();
  const docs: MedlineDoc[] = [];
  for (const m of xml.matchAll(/<document[^>]*url="([^"]+)"[\s\S]*?<\/document>/g)) {
    const block = m[0];
    const url = m[1];
    const title = stripTags(pick(block, "title"));
    const snippet = stripTags(pick(block, "FullSummary") || pick(block, "snippet"));
    if (title) docs.push({ title, url, snippet, externalId: url });
  }
  return docs;
}
function pick(block: string, name: string): string {
  const m = block.match(new RegExp(`<content name="${name}">([\\s\\S]*?)</content>`));
  return m ? m[1] : "";
}
function stripTags(s: string) {
  return s.replace(/<[^>]+>/g, "").replace(/&lt;|&gt;|&amp;/g, "").trim();
}
