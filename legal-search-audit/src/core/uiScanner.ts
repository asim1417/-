// ===========================================================================
// uiScanner.ts — Audits a single public page (§8): title, RTL/Arabic, main
// visible elements, visual issues, broken links, JS/network errors, and a
// 1–5 heuristic rating. Read-only inspection of the rendered DOM.
// ===========================================================================

import { Page } from "playwright";
import { PageAuditRecord, TargetConfig } from "../types";
import { getDiagnostics } from "./browser";
import { clamp } from "./utils";

export async function auditPage(
  page: Page,
  target: TargetConfig,
  pageKey: string,
  purpose: string
): Promise<PageAuditRecord> {
  const url = page.url();
  const diag = getDiagnostics(page);

  const dom = await page.evaluate(() => {
    const txt = (el: Element | null) => (el?.textContent || "").replace(/\s+/g, " ").trim();

    const htmlEl = document.documentElement;
    const dir = htmlEl.getAttribute("dir") || window.getComputedStyle(htmlEl).direction;
    const lang = htmlEl.getAttribute("lang") || "";

    // Sample visible text to estimate Arabic ratio.
    const bodyText = (document.body?.innerText || "").slice(0, 4000);
    const arabicChars = (bodyText.match(/[؀-ۿ]/g) || []).length;
    const latinChars = (bodyText.match(/[A-Za-z]/g) || []).length;

    // Main landmark elements visible to the user.
    const mainEls: string[] = [];
    const pushIf = (label: string, sel: string) => {
      if (document.querySelector(sel)) mainEls.push(label);
    };
    pushIf("header", "header, [role='banner']");
    pushIf("nav", "nav, [role='navigation']");
    pushIf("search box", "input[type='search'], [role='searchbox']");
    pushIf("main", "main, [role='main']");
    pushIf("footer", "footer, [role='contentinfo']");
    pushIf("forms", "form");
    pushIf("tables", "table");
    pushIf("headings", "h1,h2,h3");

    // Visual-issue heuristics.
    const issues: string[] = [];
    // Horizontal overflow (elements wider than viewport).
    const vw = window.innerWidth;
    const overflowing = Array.from(document.querySelectorAll("*")).filter((el) => {
      const r = (el as HTMLElement).getBoundingClientRect();
      return r.width > vw + 4 && r.height > 4;
    });
    if (document.body && document.body.scrollWidth > vw + 8) {
      issues.push("Horizontal overflow detected (page wider than viewport).");
    } else if (overflowing.length > 3) {
      issues.push(`${overflowing.length} elements overflow the viewport width.`);
    }
    // Empty page.
    if ((bodyText.trim().length || 0) < 20) issues.push("Page has almost no visible text.");

    // Collect internal links for broken-link sampling.
    const origin = location.origin;
    const links = Array.from(document.querySelectorAll("a[href]"))
      .map((a) => (a as HTMLAnchorElement).href)
      .filter((h) => h.startsWith(origin) && !h.includes("#"))
      .slice(0, 12);

    return {
      title: document.title || txt(document.querySelector("h1")),
      dir,
      lang,
      arabicChars,
      latinChars,
      mainEls,
      issues,
      links: Array.from(new Set(links)),
      hasH1: !!document.querySelector("h1"),
    };
  });

  const isRtl = dom.dir === "rtl";
  const isArabic = dom.arabicChars > dom.latinChars && dom.arabicChars > 30;

  // Sample broken links (bounded HEAD-style checks via fetch within the page).
  const brokenLinks = await sampleBrokenLinks(page, dom.links);

  const layoutOrganised = dom.mainEls.length >= 3 && dom.issues.length === 0;

  // Heuristic 1–5 rating.
  let rating = 3;
  if (layoutOrganised) rating += 1;
  if (isRtl && isArabic) rating += 1;
  if (dom.issues.length > 0) rating -= 1;
  if (diag.consoleErrors.length > 5) rating -= 1;
  if (brokenLinks.length > 0) rating -= 1;
  if (!dom.hasH1) rating -= 0;
  rating = clamp(rating, 1, 5);

  return {
    target: target.id,
    page_key: pageKey,
    title: dom.title,
    url,
    purpose,
    main_elements: dom.mainEls,
    is_fully_arabic: isArabic,
    is_rtl: isRtl,
    layout_organised: layoutOrganised,
    visual_issues: dom.issues,
    broken_links: brokenLinks,
    js_errors: diag.consoleErrors.slice(0, 15),
    network_errors: diag.networkErrors.slice(0, 15),
    screenshot: null, // filled by orchestrator
    rating_1_5: rating,
    status: dom.issues.includes("Page has almost no visible text.")
      ? "no_results"
      : "success",
    notes: "",
  };
}

/** Check a handful of internal links for 4xx/5xx using in-page fetch. */
async function sampleBrokenLinks(page: Page, links: string[]): Promise<string[]> {
  if (links.length === 0) return [];
  try {
    return await page.evaluate(async (urls: string[]) => {
      const broken: string[] = [];
      for (const u of urls.slice(0, 8)) {
        try {
          const res = await fetch(u, { method: "HEAD", redirect: "follow" });
          if (res.status >= 400) broken.push(`${res.status} ${u}`);
        } catch {
          // network errors here are often CORS — ignore, not "broken".
        }
      }
      return broken;
    }, links);
  } catch {
    return [];
  }
}
