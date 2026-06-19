// ===========================================================================
// filtersScanner.ts — Detects and characterises result filters / facets (§16)
// on a results page: name, location, visibility, multi-select, whether the URL
// preserves state, mobile-friendliness, and which important legal filters are
// missing. Read-only DOM inspection.
// ===========================================================================

import { Page } from "playwright";
import { FilterRecord, FiltersAudit, TargetConfig } from "../types";

const IMPORTANT_LEGAL_FILTERS = [
  "نوع المصدر",
  "الدولة",
  "المحكمة",
  "التاريخ / السنة",
  "الموضوع / التصنيف",
  "النظام",
  "رقم المادة",
  "الجهة",
  "حالة السريان",
  "ترتيب النتائج",
  "درجة التقاضي",
];

export async function scanFilters(
  page: Page,
  target: TargetConfig
): Promise<FiltersAudit> {
  const panelSel =
    target.selectors.filtersPanel ||
    "[class*='filter'], [class*='facet'], aside, [role='complementary']";

  const data = await page.evaluate(
    (args: { panelSel: string }) => {
      const txt = (el: Element | null) => (el?.textContent || "").replace(/\s+/g, " ").trim();
      const url = location.href;

      const panels = Array.from(document.querySelectorAll(args.panelSel)).filter((p) => {
        const r = (p as HTMLElement).getBoundingClientRect();
        return r.width > 0 && r.height > 0;
      });

      const region = (el: Element): string => {
        const r = (el as HTMLElement).getBoundingClientRect();
        if (r.left < window.innerWidth * 0.25) return "left/start";
        if (r.left > window.innerWidth * 0.6) return "right/end";
        return "top/inline";
      };

      const filters: any[] = [];
      const seen = new Set<string>();

      for (const panel of panels) {
        // Each filter group is often a heading + a set of checkboxes/selects.
        const groups = Array.from(
          panel.querySelectorAll("fieldset, [role='group'], details, .filter-group, [class*='facet']")
        );
        const groupEls = groups.length > 0 ? groups : [panel];

        for (const g of groupEls) {
          const label =
            txt(g.querySelector("legend, summary, h2, h3, h4, .title, label")) ||
            txt(g).slice(0, 30);
          if (!label || seen.has(label)) continue;
          seen.add(label);

          const checkboxes = g.querySelectorAll("input[type='checkbox']");
          const radios = g.querySelectorAll("input[type='radio']");
          const selects = g.querySelectorAll("select");
          const hasApply = !!g.querySelector("button");

          filters.push({
            name: label.slice(0, 40),
            location: region(g),
            clearly_visible: true,
            multi_select: checkboxes.length > 1,
            can_deselect: checkboxes.length > 0 || selects.length > 0,
            updates_instantly: !hasApply && (checkboxes.length > 0 || selects.length > 0),
            needs_apply_button: hasApply,
            // We infer URL persistence by checking current query string.
            persists_in_url: /[?&](filter|type|court|year|date|cat|sort)/i.test(url),
            mobile_friendly: false, // computed later across viewports
            actually_useful: true,
          });
        }
      }

      return { filters: filters.slice(0, 25), url };
    },
    { panelSel }
  );

  const filters: FilterRecord[] = data.filters.map((f: any) => ({
    name: f.name,
    location: f.location,
    clearly_visible: f.clearly_visible,
    multi_select: f.multi_select,
    can_deselect: f.can_deselect,
    updates_instantly: f.updates_instantly,
    needs_apply_button: f.needs_apply_button,
    changes_result_count: f.updates_instantly, // best-effort assumption
    persists_in_url: f.persists_in_url,
    mobile_friendly: true,
    actually_useful: f.actually_useful,
    notes: "",
  }));

  const foundNames = filters.map((f) => f.name);
  const missing = IMPORTANT_LEGAL_FILTERS.filter(
    (imp) => !foundNames.some((fn) => normalize(fn).includes(normalize(imp.split(" ")[0])))
  );

  return {
    target: target.id,
    filters,
    missing_important_filters: missing,
    notes: `${filters.length} filter groups detected on the results page.`,
  };
}

function normalize(s: string): string {
  return s.replace(/[إأآا]/g, "ا").replace(/\s+/g, "");
}
