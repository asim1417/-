// ===========================================================================
// browser.ts — Wraps Playwright: launching, context creation per viewport,
// polite navigation (robots-aware + rate-limited), and console/network error
// capture. All scanners receive a ready Page from here.
// ===========================================================================

import {
  Browser,
  BrowserContext,
  Page,
  chromium,
  Response,
} from "playwright";
import { RunOptions, ViewportSpec } from "../types";
import { RobotsTxt } from "./robotsCheck";
import { log, sleep } from "./utils";

export interface NavResult {
  ok: boolean;
  status: number;
  finalUrl: string;
  blockedByRobots: boolean;
  error?: string;
}

/** Captured page diagnostics, attached per Page. */
export interface PageDiagnostics {
  consoleErrors: string[];
  networkErrors: string[];
}

const diagMap = new WeakMap<Page, PageDiagnostics>();

export function getDiagnostics(page: Page): PageDiagnostics {
  return diagMap.get(page) || { consoleErrors: [], networkErrors: [] };
}

export function resetDiagnostics(page: Page): void {
  const d = diagMap.get(page);
  if (d) {
    d.consoleErrors.length = 0;
    d.networkErrors.length = 0;
  }
}

export class BrowserManager {
  private browser: Browser | null = null;
  private lastRequestAt = 0;

  constructor(private readonly options: RunOptions) {}

  async launch(): Promise<void> {
    log.step(`Launching Chromium (headless=${this.options.headless})…`);
    this.browser = await chromium.launch({
      headless: this.options.headless,
      args: ["--disable-blink-features=AutomationControlled"],
    });
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close().catch(() => undefined);
      this.browser = null;
    }
  }

  /** Create a context+page for a given viewport with honest UA + Arabic locale. */
  async newPage(viewport: ViewportSpec): Promise<{ context: BrowserContext; page: Page }> {
    if (!this.browser) throw new Error("Browser not launched");
    const context = await this.browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      isMobile: viewport.isMobile,
      hasTouch: viewport.isMobile,
      locale: "ar-SA",
      userAgent: `Mozilla/5.0 (compatible) ${this.options.uaSuffix}`,
      // Be a good citizen: do not auto-download big files.
      acceptDownloads: false,
    });
    context.setDefaultTimeout(this.options.pageTimeoutMs);
    context.setDefaultNavigationTimeout(this.options.pageTimeoutMs);

    const page = await context.newPage();
    const diag: PageDiagnostics = { consoleErrors: [], networkErrors: [] };
    diagMap.set(page, diag);

    page.on("console", (msg) => {
      if (msg.type() === "error") {
        diag.consoleErrors.push(truncate(msg.text()));
      }
    });
    page.on("pageerror", (err) => {
      diag.consoleErrors.push(truncate(`pageerror: ${err.message}`));
    });
    page.on("requestfailed", (req) => {
      const failure = req.failure();
      diag.networkErrors.push(
        truncate(`${req.method()} ${req.url()} — ${failure?.errorText ?? "failed"}`)
      );
    });
    page.on("response", (res) => {
      const s = res.status();
      if (s >= 400) {
        diag.networkErrors.push(truncate(`${s} ${res.url()}`));
      }
    });

    return { context, page };
  }

  /**
   * Politely navigate to a URL: enforce the inter-request delay, honour
   * robots.txt, and capture status. Never throws — returns a NavResult.
   */
  async goto(
    page: Page,
    url: string,
    robots: RobotsTxt | null
  ): Promise<NavResult> {
    // Rate-limit: ensure delayMs has elapsed since the previous request.
    const now = Date.now();
    const elapsed = now - this.lastRequestAt;
    if (this.lastRequestAt > 0 && elapsed < this.options.delayMs) {
      await sleep(this.options.delayMs - elapsed);
    }
    this.lastRequestAt = Date.now();

    // robots.txt check.
    if (robots) {
      let pathname = "/";
      try {
        pathname = new URL(url).pathname + new URL(url).search;
      } catch {
        /* ignore */
      }
      if (!robots.isAllowed(pathname)) {
        log.warn(`robots.txt disallows ${pathname} — skipping (not fetched).`);
        return {
          ok: false,
          status: 0,
          finalUrl: url,
          blockedByRobots: true,
          error: "Disallowed by robots.txt",
        };
      }
    }

    resetDiagnostics(page);
    try {
      const res: Response | null = await page.goto(url, {
        waitUntil: "domcontentloaded",
        timeout: this.options.pageTimeoutMs,
      });
      // Give SPA content a brief, bounded settle window.
      await page
        .waitForLoadState("networkidle", { timeout: 6000 })
        .catch(() => undefined);
      return {
        ok: res ? res.ok() : false,
        status: res ? res.status() : 0,
        finalUrl: page.url(),
        blockedByRobots: false,
      };
    } catch (err) {
      return {
        ok: false,
        status: 0,
        finalUrl: url,
        blockedByRobots: false,
        error: (err as Error).message,
      };
    }
  }
}

function truncate(s: string, max = 300): string {
  return s.length > max ? s.slice(0, max) + "…" : s;
}
