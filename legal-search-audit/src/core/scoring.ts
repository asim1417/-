// ===========================================================================
// scoring.ts — Implements the four independent 100-point scorecards (§27):
// search quality, UX, legal trust, and performance. Scores are derived from
// the collected audit data using transparent, documented heuristics so the
// numbers are reproducible and explainable in the report.
// ===========================================================================

import {
  TargetAuditBundle,
  TargetScores,
  ScoreCard,
  SearchResultRecord,
} from "../types";
import { avg, clamp, round } from "./utils";

/** Map the best visible result rank/relevance to the §27 0–5 quality scale. */
export function resultQualityPoints(rec: SearchResultRecord): number {
  if (rec.status === "no_results" || rec.top_results.length === 0) return 0;
  // Find the best auto-relevance among the top results and its rank.
  let best = rec.top_results[0];
  for (const r of rec.top_results) {
    if (r.relevance_score_auto > best.relevance_score_auto) best = r;
  }
  const rank = best.rank;
  const rel = best.relevance_score_auto; // 0..5

  if (rank === 1 && rel >= 4.3) return 5; // exact first hit
  if (rank <= 3 && rel >= 3.5) return 4; // within top 3
  if (rank <= 5 && rel >= 2.5) return 3; // within top 5
  if (rel >= 1.5) return 2; // near but indirect
  if (rec.top_results.length > 0) return 1; // generic results
  return 0;
}

export function computeScores(bundle: TargetAuditBundle): TargetScores {
  return {
    target: bundle.target,
    search: searchScore(bundle),
    ux: uxScore(bundle),
    legal_trust: legalTrustScore(bundle),
    performance: performanceScore(bundle),
  };
}

// --- Search (§27 part 1) ---------------------------------------------------
function searchScore(b: TargetAuditBundle): ScoreCard {
  const recs = b.searchResults;
  const successful = recs.filter((r) => r.status === "success");

  // 1) Result quality: 30 pts — average of per-query 0–5 normalised to 30.
  const qPoints = recs.length
    ? avg(recs.map((r) => resultQualityPoints(r)))
    : 0;
  const quality = (qPoints / 5) * 30;

  // 2) Article/system precision: 20 pts — share of results exposing article #
  //    or system name when relevant.
  const withArticle = successful.filter((r) =>
    r.top_results.some((t) => t.has_article_number || t.has_system_name)
  ).length;
  const precision = successful.length
    ? (withArticle / successful.length) * 20
    : 0;

  // 3) Filters & in-result navigation: 15 pts.
  const filterFactor = clamp(b.filters.filters.length / 5, 0, 1);
  const filters = filterFactor * 15;

  // 4) Performance/speed of search: 15 pts (faster = more).
  const times = recs.filter((r) => r.response_time_ms > 0).map((r) => r.response_time_ms);
  const meanTime = times.length ? avg(times) : 8000;
  const speed = clamp(1 - (meanTime - 1000) / 7000, 0, 1) * 15;

  // 5) Arabic RTL UX: 10 pts.
  const rtl =
    (b.searchBox.supports_rtl ? 5 : 0) + (b.searchBox.supports_arabic ? 5 : 0);

  // 6) Transparency / sources / updates: 10 pts.
  const trust =
    (b.legalTrust.records.some((r) => r.has_official_source) ? 5 : 0) +
    (b.legalTrust.records.some((r) => r.has_update_date) ? 5 : 0);

  const breakdown = {
    "جودة النتائج (30)": round(quality),
    "دقة الوصول للمادة/النظام (20)": round(precision),
    "الفلاتر والتنقل (15)": round(filters),
    "الأداء والسرعة (15)": round(speed),
    "تجربة RTL (10)": round(rtl),
    "الشفافية والمصدر (10)": round(trust),
  };
  return finalize(breakdown);
}

// --- UX (§27 part 2) -------------------------------------------------------
function uxScore(b: TargetAuditBundle): ScoreCard {
  const home = b.pages.find((p) => p.page_key === "home");
  const homeClarity = home ? (home.rating_1_5 / 5) * 10 : 5;

  const sb = b.searchBox;
  const searchBoxScore =
    ([
      sb.found,
      sb.supports_arabic,
      sb.supports_rtl,
      sb.has_search_button,
      sb.has_clear_button,
      sb.has_autosuggest,
      sb.has_advanced_search,
      sb.has_source_type_selector,
    ].filter(Boolean).length /
      8) *
    15;

  const resultsPage = clamp(
    (b.searchResults.filter((r) => r.status === "success").length /
      Math.max(1, b.searchResults.length)),
    0,
    1
  ) * 15;

  const filtersScore = clamp(b.filters.filters.length / 6, 0, 1) * 10;
  const indexesScore = clamp(b.indexes.indexes.length / 3, 0, 1) * 15;

  const detailClarity =
    b.details.pages.length > 0
      ? (b.details.pages.filter((p) => p.readable_for_legal_research).length /
          b.details.pages.length) *
        10
      : 5;

  const iconQuality = b.icons.icons.length
    ? (b.icons.icons.filter((i) => i.meaning_clear).length / b.icons.icons.length) * 5
    : 2.5;

  const navEase = clamp(b.navigation.primary_menu.length / 6, 0, 1) * 10;

  const mobilePage = b.pages.find((p) => p.url && p.page_key.includes("home"));
  const mobile = 5 * (b.searchBox.supports_rtl ? 1 : 0.6);

  const rtlConsistency =
    (b.pages.filter((p) => p.is_rtl).length / Math.max(1, b.pages.length)) * 5;

  const breakdown = {
    "وضوح الرئيسية (10)": round(homeClarity),
    "قوة صندوق البحث (15)": round(searchBoxScore),
    "جودة صفحة النتائج (15)": round(resultsPage),
    "جودة الفلاتر (10)": round(filtersScore),
    "الفهارس والتصفح (15)": round(indexesScore),
    "وضوح صفحات التفاصيل (10)": round(detailClarity),
    "جودة الأيقونات (5)": round(iconQuality),
    "سهولة التنقل (10)": round(navEase),
    "تجربة الجوال (5)": round(mobile),
    "الاتساق وRTL (5)": round(rtlConsistency),
  };
  return finalize(breakdown);
}

// --- Legal trust (§27 part 3) ---------------------------------------------
function legalTrustScore(b: TargetAuditBundle): ScoreCard {
  const recs = b.legalTrust.records;
  const frac = (pred: (r: typeof recs[number]) => boolean) =>
    recs.length ? recs.filter(pred).length / recs.length : 0;

  const breakdown = {
    "مصادر رسمية (20)": round(frac((r) => r.has_official_source) * 20),
    "تاريخ الإصدار/التحديث (15)": round(
      frac((r) => r.has_issue_date || r.has_update_date) * 15
    ),
    "حالة السريان (15)": round(frac((r) => r.has_enforcement_status) * 15),
    "الربط بين المواد/الأنظمة/الأحكام (20)": round(
      ((b.knowledge.related_articles ? 1 : 0) +
        (b.knowledge.related_judgments ? 1 : 0) +
        (b.knowledge.system_regulation_judgment_links ? 1 : 0)) /
        3 *
        20
    ),
    "وضوح نوع المحتوى (10)": round(frac((r) => r.content_type_labeled) * 10),
    "سهولة التحقق من الأصل (10)": round(frac((r) => r.source_verifiable) * 10),
    "تنبيهات/حدود المحتوى (10)": round(
      frac((r) => r.has_incomplete_content_warning || r.distinguishes_text_from_analysis) * 10
    ),
  };
  return finalize(breakdown);
}

// --- Performance (§27 part 4) ---------------------------------------------
function performanceScore(b: TargetAuditBundle): ScoreCard {
  const recs = b.performance.records;
  const desktop = recs.filter((r) => r.viewport === "desktop" || r.viewport === "laptop");
  const mobile = recs.filter((r) => r.viewport === "mobile" || r.viewport === "tablet");

  const ms = (arr: typeof recs, key: "load_event_ms" | "lcp_ms" | "fcp_ms") => {
    const vals = arr.map((r) => r[key]).filter((v): v is number => v !== null);
    return vals.length ? avg(vals) : 5000;
  };

  // Scoring helper: faster than `good` → full points, slower than `bad` → 0.
  const speedPts = (value: number, max: number, good: number, bad: number) =>
    clamp(1 - (value - good) / (bad - good), 0, 1) * max;

  const homeLoad = ms(desktop, "load_event_ms");
  const searchSpeed = avg(
    b.searchResults.filter((r) => r.response_time_ms > 0).map((r) => r.response_time_ms)
  ) || 8000;
  const detailLcp = ms(desktop, "lcp_ms");
  const mobileLoad = ms(mobile.length ? mobile : desktop, "load_event_ms");

  const avgBytes = recs.length
    ? avg(recs.map((r) => r.total_bytes))
    : 3_000_000;
  const totalErrors = recs.reduce(
    (s, r) => s + r.console_errors + r.network_errors,
    0
  );

  const breakdown = {
    "سرعة الرئيسية (20)": round(speedPts(homeLoad, 20, 1500, 9000)),
    "سرعة البحث (25)": round(speedPts(searchSpeed, 25, 1200, 9000)),
    "سرعة فتح النتائج (20)": round(speedPts(detailLcp, 20, 1500, 8000)),
    "أداء الجوال (15)": round(speedPts(mobileLoad, 15, 2000, 11000)),
    "حجم الموارد (10)": round(speedPts(avgBytes, 10, 800_000, 6_000_000)),
    "قلة الأخطاء (10)": round(clamp(1 - totalErrors / 30, 0, 1) * 10),
  };
  return finalize(breakdown);
}

function finalize(breakdown: Record<string, number>): ScoreCard {
  const total = round(
    Object.values(breakdown).reduce((a, b) => a + b, 0)
  );
  return { total, breakdown };
}
