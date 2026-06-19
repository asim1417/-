// ===========================================================================
// performanceScanner.ts — Collects performance metrics for the CURRENTLY
// loaded page using the browser's own Performance APIs (no Lighthouse binary
// dependency, so it runs anywhere). Captures FCP/LCP, DOMContentLoaded/load,
// request count, and resource byte-sizes by type, plus error counts.
// ===========================================================================

import { Page } from "playwright";
import { PerformanceRecord, TargetConfig, ViewportName } from "../types";
import { getDiagnostics } from "./browser";

export async function scanPerformance(
  page: Page,
  target: TargetConfig,
  viewport: ViewportName
): Promise<PerformanceRecord> {
  const url = page.url();

  const metrics = await page.evaluate(async () => {
    // Give LCP observer a brief window to settle.
    const lcp = await new Promise<number | null>((resolve) => {
      let value: number | null = null;
      try {
        const obs = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const last = entries[entries.length - 1] as any;
          if (last) value = last.renderTime || last.loadTime || last.startTime;
        });
        obs.observe({ type: "largest-contentful-paint", buffered: true } as any);
        setTimeout(() => {
          obs.disconnect();
          resolve(value);
        }, 1500);
      } catch {
        resolve(null);
      }
    });

    const paints = performance.getEntriesByType("paint");
    const fcp =
      (paints.find((p) => p.name === "first-contentful-paint") as any)?.startTime ?? null;

    const nav = performance.getEntriesByType("navigation")[0] as
      | PerformanceNavigationTiming
      | undefined;

    const resources = performance.getEntriesByType(
      "resource"
    ) as PerformanceResourceTiming[];

    let js = 0,
      css = 0,
      img = 0,
      font = 0,
      total = 0;
    for (const r of resources) {
      const size = (r as any).transferSize || (r as any).encodedBodySize || 0;
      total += size;
      const u = r.name.toLowerCase();
      if (r.initiatorType === "script" || /\.js(\?|$)/.test(u)) js += size;
      else if (r.initiatorType === "css" || /\.css(\?|$)/.test(u)) css += size;
      else if (r.initiatorType === "img" || /\.(png|jpe?g|gif|webp|svg|avif)(\?|$)/.test(u)) img += size;
      else if (/\.(woff2?|ttf|otf|eot)(\?|$)/.test(u)) font += size;
    }

    const lazy = document.querySelectorAll("img[loading='lazy'], iframe[loading='lazy']").length;

    return {
      fcp,
      lcp,
      dcl: nav ? nav.domContentLoadedEventEnd - nav.startTime : null,
      load: nav ? nav.loadEventEnd - nav.startTime : null,
      requestCount: resources.length,
      js,
      css,
      img,
      font,
      total,
      hasLazy: lazy > 0,
    };
  });

  const diag = getDiagnostics(page);

  return {
    target: target.id,
    url,
    viewport,
    fcp_ms: round(metrics.fcp),
    lcp_ms: round(metrics.lcp),
    tti_ms: null, // TTI requires Lighthouse; left null by design
    tbt_ms: null,
    dom_content_loaded_ms: round(metrics.dcl),
    load_event_ms: round(metrics.load),
    request_count: metrics.requestCount,
    js_bytes: metrics.js,
    css_bytes: metrics.css,
    image_bytes: metrics.img,
    font_bytes: metrics.font,
    total_bytes: metrics.total,
    has_lazy_loading: metrics.hasLazy,
    console_errors: diag.consoleErrors.length,
    network_errors: diag.networkErrors.length,
    notes: "",
  };
}

function round(n: number | null): number | null {
  return n === null || !Number.isFinite(n) ? null : Math.round(n);
}
