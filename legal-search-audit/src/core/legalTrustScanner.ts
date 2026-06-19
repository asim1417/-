// ===========================================================================
// legalTrustScanner.ts — Assesses legal-trust signals on a detail page (§24)
// and aggregates knowledge features (§25). Looks for official sources, dates,
// enforcement status, version history, content-type labelling, and links
// between systems / regulations / judgments. Read-only.
// ===========================================================================

import { Page } from "playwright";
import {
  KnowledgeFeaturesAudit,
  LegalTrustRecord,
  TargetConfig,
} from "../types";

export async function scanLegalTrust(
  page: Page,
  target: TargetConfig
): Promise<LegalTrustRecord> {
  const url = page.url();
  const d = await page.evaluate(() => {
    const body = (document.body?.innerText || "").slice(0, 6000);
    const has = (re: RegExp) => re.test(body);
    const hasEl = (sel: string) => !!document.querySelector(sel);

    const contentTypes = [
      has(/تشريع|نظام|مادة/) ? "تشريع" : "",
      has(/لائحة/) ? "لائحة" : "",
      has(/حكم|قضائي/) ? "حكم" : "",
      has(/مبدأ|مبادئ/) ? "مبدأ" : "",
      has(/فتوى/) ? "فتوى" : "",
      has(/مقال/) ? "مقال" : "",
      has(/تحليل|شرح/) ? "تحليل" : "",
    ].filter(Boolean);

    return {
      officialSource: has(/المصدر الرسمي|الجريدة الرسمية|أم القرى|الموقع الرسمي/) ||
        hasEl("a[href*='uqn.gov.sa'], a[href*='laws.boe.gov.sa'], a[href*='moj.gov.sa']"),
      issueDate: has(/تاريخ (الإصدار|النشر)|صدر (في|بتاريخ)/),
      updateDate: has(/آخر تحديث|تاريخ التحديث/),
      enforcement: has(/ساري|سارية|نافذ|ملغى|معدل/),
      previousVersion: has(/نسخة سابقة|الإصدار السابق|النسخة القديمة/),
      amendmentComparison: has(/مقارنة (التعديلات|الإصدارات)|التعديلات/),
      regulationRef: has(/اللائحة التنفيذية|تنفيذاً للمادة/),
      relatedArticleRef: has(/مادة مرتبطة|انظر المادة|راجع المادة/),
      contentLabeled: contentTypes.length > 0,
      contentTypes,
      verifiable: has(/المصدر|المرجع|رابط المصدر/),
      incompleteWarning: has(/المحتوى غير مكتمل|نسخة أولية|قد يكون المحتوى/),
      distinguishes: has(/الشرح|التحليل|تعليق المحرر/) && has(/نص (المادة|النظام|الحكم)/),
    };
  });

  return {
    target: target.id,
    url,
    has_official_source: d.officialSource,
    has_issue_date: d.issueDate,
    has_update_date: d.updateDate,
    has_enforcement_status: d.enforcement,
    has_previous_version: d.previousVersion,
    has_amendment_comparison: d.amendmentComparison,
    has_regulation_reference: d.regulationRef,
    has_related_article_reference: d.relatedArticleRef,
    content_type_labeled: d.contentLabeled,
    content_types_found: d.contentTypes,
    source_verifiable: d.verifiable,
    has_incomplete_content_warning: d.incompleteWarning,
    distinguishes_text_from_analysis: d.distinguishes,
    notes: "",
  };
}

/** Aggregate knowledge features (§25) from a representative detail page. */
export async function scanKnowledgeFeatures(
  page: Page,
  target: TargetConfig
): Promise<KnowledgeFeaturesAudit> {
  const d = await page.evaluate(() => {
    const body = (document.body?.innerText || "").slice(0, 6000);
    const has = (re: RegExp) => re.test(body);
    const hasEl = (sel: string) => !!document.querySelector(sel);
    return {
      relatedArticles: has(/مواد مرتبطة|المادة (السابقة|التالية)/),
      relatedJudgments: has(/أحكام مرتبطة/),
      similar: has(/أحكام مشابهة|سوابق مشابهة/),
      relatedTopics: has(/موضوعات (مرتبطة|ذات صلة)/),
      tree: hasEl("[class*='tree'], [role='tree']"),
      links: has(/اللائحة التنفيذية|النظام المرتبط|الحكم المرتبط/),
      searchInSystem: has(/بحث داخل النظام/) || hasEl("[placeholder*='داخل']"),
      searchInJudgment: has(/بحث داخل الحكم/),
      summaries: has(/ملخص|الخلاصة|موجز/),
      keywords: has(/كلمات مفتاحية|الوسوم/),
      smartSuggestions: has(/اقتراحات|قد يهمك|أسئلة ذات صلة/),
      versionComparison: has(/مقارنة (الإصدارات|التعديلات)/),
      ai: has(/مساعد ذكي|الذكاء الاصطناعي|اسأل|AI/i) ||
        hasEl("[class*='assistant'], [class*='chatbot'], [class*='ai-']"),
      aiCites: null,
    };
  });

  return {
    target: target.id,
    related_articles: d.relatedArticles,
    related_judgments: d.relatedJudgments,
    similar_precedents: d.similar,
    related_topics: d.relatedTopics,
    classification_tree: d.tree,
    system_regulation_judgment_links: d.links,
    search_within_system: d.searchInSystem,
    search_within_judgment: d.searchInJudgment,
    summaries: d.summaries,
    keywords: d.keywords,
    smart_suggestions: d.smartSuggestions,
    version_comparison: d.versionComparison,
    ai_assistant: d.ai,
    ai_cites_sources: d.aiCites as boolean | null,
    notes:
      "AI assistant was detected by presence only; it was NOT exercised to avoid bypassing any subscription.",
  };
}
