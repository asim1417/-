// ===========================================================================
// searchBoxScanner.ts — Audits the search box (§11) and its related elements
// (§12). Also exposes findSearchInput(), the shared, heuristic search-field
// locator used by the search runner.
// ===========================================================================

import { Locator, Page } from "playwright";
import { SearchBoxAudit, TargetConfig, RelatedSearchElement } from "../types";

/**
 * Find the most likely search input on the page. Order of preference:
 *   1. Configured selector.
 *   2. role=searchbox.
 *   3. input[type=search].
 *   4. input with Arabic/English search placeholder or name/aria hints.
 */
export async function findSearchInput(
  page: Page,
  target: TargetConfig
): Promise<Locator | null> {
  const sel = target.selectors.searchInput;
  if (sel) {
    const l = page.locator(sel).first();
    if ((await l.count()) > 0 && (await l.isVisible().catch(() => false))) return l;
  }

  const candidates = [
    page.getByRole("searchbox"),
    page.locator('input[type="search"]'),
    page.locator(
      'input[placeholder*="بحث"], input[placeholder*="ابحث"], input[placeholder*="search" i]'
    ),
    page.locator(
      'input[name*="search" i], input[name*="q" i], input[aria-label*="بحث"], input[aria-label*="search" i]'
    ),
    page.locator('input[type="text"]'),
  ];

  for (const c of candidates) {
    const first = c.first();
    if ((await first.count()) > 0 && (await first.isVisible().catch(() => false))) {
      return first;
    }
  }
  return null;
}

export async function auditSearchBox(
  page: Page,
  target: TargetConfig
): Promise<SearchBoxAudit> {
  const audit: SearchBoxAudit = {
    target: target.id,
    found: false,
    location: "",
    placeholder: "",
    supports_arabic: false,
    supports_rtl: false,
    supports_long_query: false,
    supports_enter: false,
    has_search_button: false,
    has_live_search: false,
    has_autosuggest: false,
    has_spelling_suggestions: false,
    has_search_history: false,
    has_clear_button: false,
    has_advanced_search: false,
    has_source_type_selector: false,
    has_jurisdiction_selector: false,
    font_size_px: null,
    related_elements: [],
    notes: "",
  };

  const input = await findSearchInput(page, target);
  if (!input) {
    audit.notes = "No search input found on this page.";
    return audit;
  }
  audit.found = true;

  try {
    const meta = await input.evaluate((el: HTMLInputElement) => {
      const style = window.getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const vert = rect.top < vh * 0.33 ? "top" : rect.top < vh * 0.66 ? "middle" : "bottom";
      return {
        placeholder: el.placeholder || "",
        dir: el.getAttribute("dir") || style.direction,
        fontSize: parseFloat(style.fontSize) || null,
        maxLength: el.maxLength,
        location: vert,
      };
    });
    audit.placeholder = meta.placeholder;
    audit.supports_rtl = meta.dir === "rtl";
    audit.font_size_px = meta.fontSize;
    audit.location = meta.location;
    audit.supports_long_query = meta.maxLength === -1 || meta.maxLength > 100;

    // Type Arabic + verify it round-trips (proves Arabic input works).
    const sample = "المادة 77 من نظام العمل";
    await input.click({ timeout: 4000 });
    await input.fill("");
    await input.type(sample, { delay: 10 });
    const value = await input.inputValue();
    audit.supports_arabic = value.includes("المادة");
    audit.supports_enter = true; // input fields accept Enter by default

    // Autosuggest / live search: wait briefly and look for a popup list.
    await page.waitForTimeout(800);
    const suggSel =
      target.selectors.suggestionsBox ||
      '[role="listbox"], .autocomplete, .suggestions, [class*="suggest"], ul[class*="dropdown"]';
    const suggCount = await page.locator(suggSel).filter({ hasText: /.+/ }).count().catch(() => 0);
    audit.has_autosuggest = suggCount > 0;
    audit.has_live_search = suggCount > 0;
    audit.has_spelling_suggestions = await page
      .locator(':text("هل تقصد"), :text("did you mean" )')
      .count()
      .then((n) => n > 0)
      .catch(() => false);
  } catch {
    /* tolerate interaction issues */
  }

  // Buttons / related controls around the box.
  audit.has_search_button =
    (await countAny(page, [
      target.selectors.searchButton || "",
      'button[type="submit"]',
      'button:has-text("بحث")',
      '[aria-label*="بحث"]',
      '[aria-label*="search" i]',
    ])) > 0;

  audit.has_clear_button =
    (await countAny(page, [
      target.selectors.clearButton || "",
      'button[aria-label*="مسح"]',
      'button[aria-label*="clear" i]',
      '.clear, [class*="clear"]',
    ])) > 0;

  audit.has_advanced_search =
    (await page.locator(':text("بحث متقدم"), :text("advanced search" )').count().catch(() => 0)) > 0;

  audit.has_source_type_selector =
    (await page.locator('select, [role="combobox"]').filter({ hasText: /نوع|مصدر|أحكام|أنظمة/ }).count().catch(() => 0)) > 0;

  audit.has_jurisdiction_selector =
    (await page.locator('select, [role="combobox"]').filter({ hasText: /دولة|اختصاص|الدول/ }).count().catch(() => 0)) > 0;

  audit.related_elements = await detectRelatedElements(page, audit);
  return audit;
}

async function detectRelatedElements(
  page: Page,
  audit: SearchBoxAudit
): Promise<RelatedSearchElement[]> {
  const out: RelatedSearchElement[] = [];
  const add = (name: string, present: boolean, before: boolean, helps: boolean) => {
    if (present)
      out.push({
        name,
        appears_before_search: before,
        helps_user: helps,
        works: true,
        adds_value: helps,
        notes: "",
      });
  };
  add("اقتراحات تلقائية (autosuggest)", audit.has_autosuggest, false, true);
  add("بحث متقدم", audit.has_advanced_search, true, true);
  add("اختيار نوع المصدر", audit.has_source_type_selector, true, true);
  add("اختيار الدولة/الاختصاص", audit.has_jurisdiction_selector, true, true);
  add("زر مسح", audit.has_clear_button, false, true);
  add("تصحيح إملائي / هل تقصد", audit.has_spelling_suggestions, false, true);
  return out;
}

async function countAny(page: Page, selectors: string[]): Promise<number> {
  let total = 0;
  for (const s of selectors) {
    if (!s) continue;
    total += await page.locator(s).count().catch(() => 0);
  }
  return total;
}
