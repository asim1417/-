// ───────── OpenStax — Anatomy & Physiology (رخصة CC BY 4.0) ─────────
// المحتوى مفتوح؛ يُبنى منه شرح أصلي مع الإحالة. صفحات الكتاب عبر osweb/CNX.
export type OpenStaxDoc = { title: string; url: string; text: string; externalId: string };

/**
 * يجلب نص فصل من OpenStax A&P. ملاحظة: OpenStax يقدّم المحتوى كصفحات HTML؛
 * هذه الدالة تجلب الصفحة وتستخرج النص الأساسي. احترم الرخصة (CC BY) بالإحالة.
 */
export async function fetchOpenStax(pageUrl: string, title: string, externalId: string): Promise<OpenStaxDoc> {
  const res = await fetch(pageUrl, { headers: { "User-Agent": "MiftahAlTibb/0.1" } });
  if (!res.ok) throw new Error(`OpenStax ${res.status}`);
  const html = await res.text();
  const main = (html.match(/<main[\s\S]*?<\/main>/) || [html])[0];
  const text = main.replace(/<script[\s\S]*?<\/script>/g, "")
    .replace(/<style[\s\S]*?<\/style>/g, "")
    .replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 8000);
  return { title, url: pageUrl, text, externalId };
}
