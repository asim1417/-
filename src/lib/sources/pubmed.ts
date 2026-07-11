// ───────── PubMed / PMC — NCBI E-utilities (نطاق عام حكومي) ─────────
// المرجع: https://www.ncbi.nlm.nih.gov/books/NBK25501/
const EUTILS = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils";
const KEY = process.env.NCBI_API_KEY ? `&api_key=${process.env.NCBI_API_KEY}` : "";
const UA = `MiftahAlTibb/0.1 (${process.env.CONTACT_EMAIL || "platform@miftah.example"})`;

export type PubmedDoc = { pmid: string; title: string; url: string; abstract: string };

/** يبحث ويجلب ملخّصات مقالات PubMed حول موضوع تعليمي. */
export async function searchPubmed(term: string, max = 3): Promise<PubmedDoc[]> {
  const s = await fetch(
    `${EUTILS}/esearch.fcgi?db=pubmed&retmode=json&retmax=${max}&term=${encodeURIComponent(term)}${KEY}`,
    { headers: { "User-Agent": UA } }
  );
  const ids: string[] = (await s.json())?.esearchresult?.idlist ?? [];
  if (!ids.length) return [];
  const f = await fetch(
    `${EUTILS}/efetch.fcgi?db=pubmed&retmode=xml&id=${ids.join(",")}${KEY}`,
    { headers: { "User-Agent": UA } }
  );
  const xml = await f.text();
  const docs: PubmedDoc[] = [];
  for (const art of xml.matchAll(/<PubmedArticle>[\s\S]*?<\/PubmedArticle>/g)) {
    const block = art[0];
    const pmid = (block.match(/<PMID[^>]*>(\d+)<\/PMID>/) || [])[1] || "";
    const title = tag(block, "ArticleTitle");
    const abstract = [...block.matchAll(/<AbstractText[^>]*>([\s\S]*?)<\/AbstractText>/g)]
      .map((m) => strip(m[1])).join(" ");
    if (pmid) docs.push({ pmid, title, abstract, url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/` });
  }
  return docs;
}
function tag(b: string, t: string) { const m = b.match(new RegExp(`<${t}[^>]*>([\\s\\S]*?)</${t}>`)); return m ? strip(m[1]) : ""; }
function strip(s: string) { return s.replace(/<[^>]+>/g, "").trim(); }
