// ===========================================================================
// seoScanner.ts — Inspects on-page SEO / archivability signals (§21): title,
// meta description, headings, canonical, robots meta, structured data,
// Open Graph, lang/dir, descriptive URLs and internal-link count. Also checks
// for sitemap.xml / robots.txt at the origin (once per target).
// ===========================================================================

import { Page, request as pwRequest } from "playwright";
import { SeoRecord, TargetConfig } from "../types";

export async function scanSeo(
  page: Page,
  target: TargetConfig
): Promise<SeoRecord> {
  const url = page.url();
  const d = await page.evaluate(() => {
    const meta = (name: string, attr = "name") =>
      (document.querySelector(`meta[${attr}='${name}']`) as HTMLMetaElement | null)?.content || "";

    const h1 = Array.from(document.querySelectorAll("h1")).map((h) =>
      (h.textContent || "").replace(/\s+/g, " ").trim()
    );

    const ld = Array.from(document.querySelectorAll("script[type='application/ld+json']"));
    const ldTypes: string[] = [];
    for (const node of ld) {
      try {
        const json = JSON.parse(node.textContent || "{}");
        const arr = Array.isArray(json) ? json : [json];
        for (const o of arr) {
          if (o && o["@type"]) ldTypes.push(String(o["@type"]));
        }
      } catch {
        /* ignore malformed */
      }
    }

    const og = document.querySelector("meta[property^='og:']");
    const canonical =
      (document.querySelector("link[rel='canonical']") as HTMLLinkElement | null)?.href || null;
    const robotsMeta = meta("robots") || null;

    const origin = location.origin;
    const internalLinks = Array.from(document.querySelectorAll("a[href]"))
      .map((a) => (a as HTMLAnchorElement).href)
      .filter((h) => h.startsWith(origin)).length;

    return {
      title: document.title || "",
      description: meta("description"),
      h1,
      h2: document.querySelectorAll("h2").length,
      h3: document.querySelectorAll("h3").length,
      canonical,
      robotsMeta,
      ldTypes: Array.from(new Set(ldTypes)),
      hasOg: !!og,
      lang: document.documentElement.getAttribute("lang") || "",
      dir:
        document.documentElement.getAttribute("dir") ||
        window.getComputedStyle(document.documentElement).direction,
      internalLinks,
    };
  });

  const issues: string[] = [];
  if (!d.title) issues.push("Missing <title>.");
  if (!d.description) issues.push("Missing meta description.");
  if (d.h1.length === 0) issues.push("Missing H1.");
  if (d.h1.length > 1) issues.push("Multiple H1 tags.");
  if (!d.canonical) issues.push("Missing canonical link.");
  if (d.ldTypes.length === 0) issues.push("No structured data (JSON-LD).");
  if (!d.hasOg) issues.push("No Open Graph tags.");

  const urlDescriptive = /[ء-ي]|article|law|system|judgment|hukm|nizam|\d{2,}/i.test(
    decodeURIComponent(url)
  );
  if (!urlDescriptive) issues.push("URL is not descriptive (no slug/id cues).");

  return {
    target: target.id,
    url,
    title: d.title,
    meta_description: d.description,
    h1: d.h1,
    h2_count: d.h2,
    h3_count: d.h3,
    canonical: d.canonical,
    robots_meta: d.robotsMeta,
    has_sitemap: false, // set by origin-level check
    has_structured_data: d.ldTypes.length > 0,
    structured_data_types: d.ldTypes,
    has_open_graph: d.hasOg,
    lang: d.lang,
    dir: d.dir,
    url_is_descriptive: urlDescriptive,
    internal_links_count: d.internalLinks,
    issues,
    notes: "",
  };
}

/** Check the origin for robots.txt and sitemap.xml (once per target). */
export async function checkOriginSeoFiles(
  origin: string,
  uaSuffix: string
): Promise<{ hasRobots: boolean; hasSitemap: boolean }> {
  const ctx = await pwRequest.newContext({
    userAgent: `Mozilla/5.0 ${uaSuffix}`,
    timeout: 12000,
  });
  let hasRobots = false;
  let hasSitemap = false;
  try {
    const r = await ctx.get(new URL("/robots.txt", origin).toString());
    hasRobots = r.ok();
  } catch {
    /* ignore */
  }
  try {
    const s = await ctx.get(new URL("/sitemap.xml", origin).toString());
    hasSitemap = s.ok();
  } catch {
    /* ignore */
  }
  await ctx.dispose();
  return { hasRobots, hasSitemap };
}
