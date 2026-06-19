// ===========================================================================
// indexesScanner.ts — Inspects index / classification browsing pages (§13):
// organisation style, internal search, filters, counts, expandable trees,
// breadcrumbs, and an estimate of clicks to reach an article. Descriptive only.
// ===========================================================================

import { Page } from "playwright";
import { IndexesAudit, IndexRecord, TargetConfig } from "../types";

export async function scanIndexPage(
  page: Page,
  target: TargetConfig,
  name: string
): Promise<IndexRecord> {
  const url = page.url();
  const data = await page.evaluate(() => {
    const txt = (el: Element | null) => (el?.textContent || "").replace(/\s+/g, " ").trim();

    const listItems = Array.from(
      document.querySelectorAll("ul li a, ol li a, [class*='index'] a, [class*='category'] a")
    );
    const labels = listItems.map((a) => txt(a)).filter(Boolean);

    // Organisation heuristic.
    let organisation: string = "unknown";
    const alpha = labels.filter((l) => /^[ء-ي]/.test(l));
    const years = labels.filter((l) => /\b(1[34]\d{2}|20\d{2})\b/.test(l));
    if (years.length > labels.length * 0.4 && years.length > 3) organisation = "chronological";
    else if (alpha.length > labels.length * 0.6 && labels.length > 5) organisation = "alphabetical";
    else if (labels.length > 5) organisation = "thematic";

    const hasInternalSearch =
      !!document.querySelector("input[type='search'], [role='searchbox'], input[placeholder*='بحث']");
    const hasFilters =
      !!document.querySelector("[class*='filter'], [class*='facet'], aside select");
    const showsCounts = /\(\s*[\d٠-٩]+\s*\)|[\d٠-٩]+\s*(نتيجة|مادة|حكم|عنصر)/.test(
      document.body?.innerText?.slice(0, 5000) || ""
    );
    const expandable =
      !!document.querySelector("details, [aria-expanded], [class*='accordion'], [class*='tree'], [class*='toggle']");
    const hasTree = !!document.querySelector("[class*='tree'], [role='tree']");
    const hasBreadcrumb = !!document.querySelector("[class*='breadcrumb'], [aria-label*='مسار']");

    return {
      itemCount: labels.length,
      organisation,
      hasInternalSearch,
      hasFilters,
      showsCounts,
      expandable,
      hasTree,
      hasBreadcrumb,
    };
  });

  return {
    name,
    url,
    organisation: data.organisation as IndexRecord["organisation"],
    has_internal_search: data.hasInternalSearch,
    has_filters: data.hasFilters,
    shows_counts: data.showsCounts,
    expandable_subcategories: data.expandable,
    has_breadcrumb: data.hasBreadcrumb,
    has_tree: data.hasTree,
    // Rough estimate: list → category → article ≈ 2–3 clicks.
    clicks_to_reach_article: data.itemCount > 0 ? (data.expandable ? 3 : 2) : null,
    suitable_for_legal_research:
      data.itemCount > 5 && (data.hasInternalSearch || data.hasFilters),
    notes: `${data.itemCount} index entries detected.`,
  };
}

export function emptyIndexesAudit(target: TargetConfig): IndexesAudit {
  return { target: target.id, indexes: [], notes: "" };
}
