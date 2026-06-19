// ===========================================================================
// detailsPageScanner.ts — Inspects a publicly available detail page: either a
// system/article page (§14) or a judgment page (§15). Records which structural
// fields and tools are PRESENT (not their full content), whether content is
// hidden behind a subscription, and readability for legal research.
// ===========================================================================

import { Page } from "playwright";
import { DetailsPageRecord, TargetConfig } from "../types";

export async function scanDetailsPage(
  page: Page,
  target: TargetConfig
): Promise<DetailsPageRecord> {
  const url = page.url();

  const data = await page.evaluate(() => {
    const body = (document.body?.innerText || "").slice(0, 6000);
    const has = (re: RegExp) => re.test(body);
    const hasEl = (sel: string) => !!document.querySelector(sel);

    const pageType =
      has(/المحكمة|الدائرة|رقم القضية|رقم الحكم|سابقة قضائية/) ? "judgment"
      : has(/المادة|نظام|لائحة|مرسوم/) ? "system_article"
      : "unknown";

    const fields: Record<string, boolean> = {
      system_name: has(/نظام|لائحة/),
      article_number: /(المادة|مادة)\s*[\(]?\s*[\d٠-٩]+/.test(body),
      issue_date: has(/تاريخ (الإصدار|النشر)|صدر في|بتاريخ/),
      enforcement_status: has(/ساري|سارية|ملغى|معدل|نافذ/),
      court: has(/المحكمة/),
      circuit: has(/الدائرة/),
      case_number: /رقم القضية\s*[:：]?\s*[\d٠-٩]/.test(body),
      judgment_number: /رقم الحكم\s*[:：]?\s*[\d٠-٩]/.test(body),
      subject: has(/الموضوع/),
      principles: has(/المبدأ|المبادئ/),
      keywords: has(/كلمات مفتاحية|الوسوم|كلمات دلالية/),
    };

    return {
      pageType,
      fields,
      hasCopy: hasEl("[aria-label*='نسخ'], [title*='نسخ'], button:has-text('نسخ'), [class*='copy']"),
      hasShare: hasEl("[aria-label*='مشارك'], [class*='share'], button:has-text('مشاركة')"),
      hasPrint: hasEl("[aria-label*='طباعة'], [class*='print'], button:has-text('طباعة')"),
      hasPdf: hasEl("a[href$='.pdf'], [aria-label*='PDF'], button:has-text('PDF')"),
      hasOfficialSource: has(/المصدر الرسمي|أم القرى|مصدر|الجريدة الرسمية/),
      hasLastUpdate: has(/آخر تحديث|تم التحديث/),
      hasRelatedArticles: has(/مواد مرتبطة|المادة السابقة|المادة التالية/) ||
        hasEl("[class*='related']"),
      hasRelatedJudgments: has(/أحكام (مرتبطة|مشابهة)|سوابق مشابهة/),
      hidden: /للمشتركين|سجل الدخول لعرض|اشترك لقراءة|محتوى مدفوع/.test(body),
      contentTypes: [
        has(/نص النظام|مادة|نظام/) ? "تشريع" : "",
        has(/لائحة/) ? "لائحة" : "",
        has(/حكم|قضائي/) ? "حكم" : "",
        has(/مبدأ|مبادئ/) ? "مبدأ" : "",
        has(/مقال|تحليل|شرح/) ? "تحليل" : "",
      ].filter(Boolean),
      readable: body.length > 200 && !/للمشتركين فقط/.test(body),
    };
  });

  return {
    target: target.id,
    url,
    page_type: data.pageType as DetailsPageRecord["page_type"],
    fields_present: data.fields,
    has_copy_button: data.hasCopy,
    has_share_button: data.hasShare,
    has_print_button: data.hasPrint,
    has_pdf: data.hasPdf,
    has_official_source: data.hasOfficialSource,
    has_last_update: data.hasLastUpdate,
    has_related_articles: data.hasRelatedArticles,
    has_related_judgments: data.hasRelatedJudgments,
    readable_for_legal_research: data.readable,
    content_hidden_by_subscription: data.hidden,
    notes: `Content types observed: ${data.contentTypes.join(", ") || "none"}.`,
  };
}
