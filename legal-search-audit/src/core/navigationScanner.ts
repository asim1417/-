// ===========================================================================
// navigationScanner.ts — Builds a navigation map (§9 & §19): primary menu,
// footer links, breadcrumbs/pagination presence, a few representative
// transitions, and click-depth estimates to key destinations.
// ===========================================================================

import { Page } from "playwright";
import { NavigationMap, NavTransitionRecord, TargetConfig } from "../types";

export async function scanNavigation(
  page: Page,
  target: TargetConfig
): Promise<NavigationMap> {
  const data = await page.evaluate(() => {
    const txt = (el: Element) => (el.textContent || "").replace(/\s+/g, " ").trim();
    const uniq = (arr: string[]) => Array.from(new Set(arr.filter(Boolean)));

    const navLinks = Array.from(
      document.querySelectorAll("header a, nav a, [role='navigation'] a")
    )
      .map(txt)
      .filter((t) => t.length > 0 && t.length < 40);

    const footerLinks = Array.from(
      document.querySelectorAll("footer a, [role='contentinfo'] a")
    )
      .map(txt)
      .filter((t) => t.length > 0 && t.length < 40);

    const hasBreadcrumbs =
      !!document.querySelector(
        "[class*='breadcrumb'], nav[aria-label*='bread' i], ol.breadcrumb, [aria-label*='مسار']"
      );

    const hasPagination =
      !!document.querySelector(
        "[class*='pagination'], nav[aria-label*='pag' i], [aria-label*='صفحات'], ul.pages"
      );

    const hasDropdowns =
      document.querySelectorAll("[class*='dropdown'], details, [aria-haspopup]").length > 0;

    return {
      navLinks: uniq(navLinks).slice(0, 25),
      footerLinks: uniq(footerLinks).slice(0, 25),
      hasBreadcrumbs,
      hasPagination,
      hasDropdowns,
    };
  });

  // Representative transition observations (descriptive — we do not click
  // through everything to stay polite; the search runner already exercises the
  // search→results transition).
  const transitions: NavTransitionRecord[] = [
    {
      target: target.id,
      from_page: "home",
      element_clicked: "primary menu links",
      to_page: "section pages",
      is_clear: data.navLinks.length > 0,
      has_loading_indicator: false,
      preserves_search_state: false,
      preserves_filters_on_back: false,
      url_is_shareable: true,
      mobile_friendly: true,
      notes: `${data.navLinks.length} primary links detected.`,
    },
  ];

  return {
    target: target.id,
    primary_menu: data.navLinks,
    footer_links: data.footerLinks,
    has_breadcrumbs: data.hasBreadcrumbs,
    has_pagination: data.hasPagination,
    transitions,
    click_depth: {
      search: 0,
      system: data.navLinks.some((l) => /نظام|أنظمة|تشريع/.test(l)) ? 1 : null,
      judgment: data.navLinks.some((l) => /حكم|أحكام|سوابق/.test(l)) ? 1 : null,
      index: data.navLinks.some((l) => /فهرس|تصنيف|الفهارس/.test(l)) ? 1 : null,
      pricing: data.navLinks.some((l) => /اشترك|أسعار|باقات/.test(l)) ? 1 : null,
      contact: data.footerLinks.some((l) => /تواصل|اتصل/.test(l)) ? 1 : null,
      help: data.footerLinks.some((l) => /مساعدة|دعم|الأسئلة/.test(l)) ? 1 : null,
    },
    notes: data.hasDropdowns ? "Dropdown menus present." : "",
  };
}
