#!/usr/bin/env node
// ===========================================================================
// index.ts — CLI entry point and orchestrator.
//
// Responsibilities:
//   * Parse CLI flags (overriding env + defaults).
//   * Load the legal-query CSV.
//   * For each target: load robots.txt, audit public pages, run search probes,
//     inspect a details page, scan filters/indexes/perf/a11y/seo/trust, score.
//   * Persist results INCREMENTALLY so a crash never loses prior work (§32).
//   * Never let one target's failure abort the whole run (§31).
//
// Ethics: enforced centrally by safetyGuard + robotsCheck + the polite,
// rate-limited BrowserManager. We only record what a user can see.
// ===========================================================================

import * as fs from "fs";
import * as path from "path";

import {
  LegalQuery,
  RunOptions,
  TargetAuditBundle,
  TargetConfig,
  ViewportSpec,
} from "./types";
import { DEFAULT_OPTIONS, TARGETS, resolveViewports } from "./config";
import { BrowserManager } from "./core/browser";
import { RobotsTxt } from "./core/robotsCheck";
import { SafetyState } from "./core/safetyGuard";
import { Screenshotter } from "./core/screenshot";
import {
  ensureDir,
  log,
  parseCsv,
  readJsonOr,
  sleep,
  writeJson,
} from "./core/utils";

// Scanners
import { auditPage } from "./core/uiScanner";
import { scanNavigation } from "./core/navigationScanner";
import { scanIcons } from "./core/iconScanner";
import { auditSearchBox } from "./core/searchBoxScanner";
import { scanFilters } from "./core/filtersScanner";
import { scanIndexPage } from "./core/indexesScanner";
import { scanDetailsPage } from "./core/detailsPageScanner";
import { scanPerformance } from "./core/performanceScanner";
import { scanAccessibility } from "./core/accessibilityScanner";
import { scanSeo, checkOriginSeoFiles } from "./core/seoScanner";
import { scanLegalTrust, scanKnowledgeFeatures } from "./core/legalTrustScanner";
import { runQuery, attachSearchScreenshot, inferProbeType } from "./core/searchRunner";
import { computeScores } from "./core/scoring";
import { Reporter } from "./core/reporter";

// ---------------------------------------------------------------------------
// CLI parsing
// ---------------------------------------------------------------------------
function parseArgs(argv: string[]): RunOptions {
  const opts: RunOptions = { ...DEFAULT_OPTIONS };
  const args = argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    const next = () => args[++i];
    switch (a) {
      case "--targets":
        opts.targets = next().split(",").map((s) => s.trim()).filter(Boolean);
        break;
      case "--queries":
        opts.queriesFile = next();
        break;
      case "--headless":
        opts.headless = parseBool(next());
        break;
      case "--output":
        opts.output = next();
        break;
      case "--maxQueries":
        opts.maxQueries = parseInt(next(), 10);
        break;
      case "--saveScreenshots":
        opts.saveScreenshots = parseBool(next());
        break;
      case "--viewport":
        opts.viewport = next() as RunOptions["viewport"];
        break;
      case "--delayMs":
        opts.delayMs = parseInt(next(), 10);
        break;
      case "--stopOnBlock":
        opts.stopOnBlock = parseBool(next());
        break;
      case "--pageTimeoutMs":
        opts.pageTimeoutMs = parseInt(next(), 10);
        break;
      case "--fresh":
        opts.fresh = true;
        break;
      case "--help":
      case "-h":
        printHelp();
        process.exit(0);
      default:
        if (a.startsWith("--")) log.warn(`Unknown option ignored: ${a}`);
    }
  }
  return opts;
}

function parseBool(v: string | undefined): boolean {
  return v === "true" || v === "1" || v === "yes";
}

function printHelp(): void {
  console.log(`
legal-search-audit — descriptive UX/search audit for Saudi legal-search sites.

Usage:
  legal-search-audit [options]

Options:
  --targets <ids>         Comma list of target ids (default: qanoniah,qistas)
  --queries <file>        Path to legal queries CSV (default: ./data/legal_queries.csv)
  --headless <bool>       Run headless (default: true)
  --output <dir>          Reports output directory (default: ./reports)
  --maxQueries <n>        Limit number of queries (quick trial)
  --saveScreenshots <b>   Save full-page screenshots (default: true)
  --viewport <mode>       desktop | mobile | all (default: desktop)
  --delayMs <ms>          Delay between requests (default: 7000 — be polite!)
  --stopOnBlock <bool>    Stop a target on captcha/block (default: true)
  --pageTimeoutMs <ms>    Per-page timeout (default: 45000)
  --fresh                 Wipe previous reports before running
  -h, --help              Show this help

Example:
  legal-search-audit --targets qanoniah,qistas --queries ./data/legal_queries.csv \\
    --headless true --output ./reports --maxQueries 8 --viewport all
`);
}

// ---------------------------------------------------------------------------
// Query loading
// ---------------------------------------------------------------------------
function loadQueries(file: string, max: number | null): LegalQuery[] {
  if (!fs.existsSync(file)) {
    log.error(`Queries file not found: ${file}`);
    return [];
  }
  const rows = parseCsv(fs.readFileSync(file, "utf8"));
  let queries: LegalQuery[] = rows
    .filter((r) => r.query && r.query.trim().length > 0)
    .map((r) => ({
      id: r.id || "",
      category: r.category || "",
      query: r.query,
      expected_intent: r.expected_intent || "",
      expected_sources: r.expected_sources || "",
      notes: r.notes || "",
    }));
  queries.forEach((q) => (q.probe_type = inferProbeType(q)));
  if (max && max > 0) queries = queries.slice(0, max);
  return queries;
}

// ---------------------------------------------------------------------------
// Per-target audit
// ---------------------------------------------------------------------------
async function auditTarget(
  target: TargetConfig,
  queries: LegalQuery[],
  options: RunOptions,
  browser: BrowserManager,
  shots: Screenshotter,
  safety: SafetyState
): Promise<TargetAuditBundle> {
  log.step(`==== Auditing ${target.label} (${target.id}) ====`);
  const notes: string[] = [];

  // Bundle skeleton with safe empty defaults (so a crash mid-run still
  // produces a valid, partial bundle).
  const bundle: TargetAuditBundle = {
    target: target.id,
    label: target.label,
    searchResults: [],
    pages: [],
    navigation: {
      target: target.id,
      primary_menu: [],
      footer_links: [],
      has_breadcrumbs: false,
      has_pagination: false,
      transitions: [],
      click_depth: {},
      notes: "",
    },
    icons: { target: target.id, icons: [], duplicate_functions: [], iconless_buttons: [], notes: "" },
    searchBox: {
      target: target.id, found: false, location: "", placeholder: "",
      supports_arabic: false, supports_rtl: false, supports_long_query: false,
      supports_enter: false, has_search_button: false, has_live_search: false,
      has_autosuggest: false, has_spelling_suggestions: false, has_search_history: false,
      has_clear_button: false, has_advanced_search: false, has_source_type_selector: false,
      has_jurisdiction_selector: false, font_size_px: null, related_elements: [], notes: "",
    },
    indexes: { target: target.id, indexes: [], notes: "" },
    filters: { target: target.id, filters: [], missing_important_filters: [], notes: "" },
    details: { target: target.id, pages: [], notes: "" },
    performance: { target: target.id, records: [], notes: "" },
    accessibility: { target: target.id, records: [], notes: "" },
    seo: { target: target.id, records: [], has_sitemap_xml: false, has_robots_txt: false, notes: "" },
    legalTrust: { target: target.id, records: [], notes: "" },
    knowledge: {
      target: target.id, related_articles: false, related_judgments: false,
      similar_precedents: false, related_topics: false, classification_tree: false,
      system_regulation_judgment_links: false, search_within_system: false,
      search_within_judgment: false, summaries: false, keywords: false,
      smart_suggestions: false, version_comparison: false, ai_assistant: false,
      ai_cites_sources: null, notes: "",
    },
    subscription: {
      target: target.id, has_login_page: false, has_register_page: false,
      has_forgot_password: false, has_pricing_page: false, free_vs_paid_clear: false,
      clear_cta: false, has_trial: false, has_plans: false, has_plan_comparison: false,
      has_sales_contact: false, paywall_message_clear: false, notes: "",
    },
    scores: {
      target: target.id,
      search: { total: 0, breakdown: {} },
      ux: { total: 0, breakdown: {} },
      legal_trust: { total: 0, breakdown: {} },
      performance: { total: 0, breakdown: {} },
    },
    blocked: false,
    notes,
  };

  // robots.txt + origin SEO files.
  let robots: RobotsTxt | null = null;
  try {
    robots = await RobotsTxt.load(target.baseUrl, options.uaSuffix);
    const seoFiles = await checkOriginSeoFiles(target.baseUrl, options.uaSuffix);
    bundle.seo.has_robots_txt = seoFiles.hasRobots;
    bundle.seo.has_sitemap_xml = seoFiles.hasSitemap;
  } catch (err) {
    notes.push(`robots/seo-file check failed: ${(err as Error).message}`);
  }

  const viewports = resolveViewports(options.viewport);
  const desktop = viewports.find((v) => !v.isMobile) || viewports[0];
  const mobile = viewports.find((v) => v.isMobile) || null;

  // ---- DESKTOP PASS -------------------------------------------------------
  await withPage(browser, desktop, async (page) => {
    // 1) Public pages audit (home + configured pages).
    for (const [key, url] of Object.entries(target.pages)) {
      if (!url) continue;
      if (safety.isBlocked(target.id) && options.stopOnBlock) break;
      try {
        const nav = await browser.goto(page, url, robots);
        if (nav.blockedByRobots) {
          notes.push(`Skipped ${key} (robots.txt).`);
          continue;
        }
        const rec = await auditPage(page, target, key, purposeOf(key));
        rec.screenshot = await shots.capture(page, target.id, `page-${key}`, desktop.name);
        bundle.pages.push(rec);

        // First-class scans anchored on the home page.
        if (key === "home") {
          bundle.navigation = await safe(() => scanNavigation(page, target), bundle.navigation);
          bundle.icons = await safe(() => scanIcons(page, target), bundle.icons);
          bundle.searchBox = await safe(() => auditSearchBox(page, target), bundle.searchBox);
        }
        // SEO + a11y + perf on the home & search pages.
        if (key === "home" || key === "search") {
          bundle.seo.records.push(await safe(() => scanSeo(page, target), null as any));
          bundle.accessibility.records.push(await safe(() => scanAccessibility(page, target), null as any));
          bundle.performance.records.push(await safe(() => scanPerformance(page, target, desktop.name), null as any));
        }
        // Subscription funnel signals.
        detectSubscription(key, bundle);
      } catch (err) {
        notes.push(`Page "${key}" failed: ${(err as Error).message}`);
      }
      writeIncremental(options, bundle);
    }
    bundle.seo.records = bundle.seo.records.filter(Boolean);
    bundle.accessibility.records = bundle.accessibility.records.filter(Boolean);
    bundle.performance.records = bundle.performance.records.filter(Boolean);

    // 2) Search probes.
    let filtersScanned = false;
    let detailsScanned = false;
    for (const q of queries) {
      if (safety.isBlocked(target.id) && options.stopOnBlock) {
        bundle.blocked = true;
        notes.push("Stopped search probes — target flagged as blocked.");
        break;
      }
      const rec = await runQuery(page, browser, robots, target, q, shots, safety);
      await attachSearchScreenshot(page, shots, target, q, rec);
      bundle.searchResults.push(rec);
      log.info(`[${target.id}] ${q.id} "${q.query}" → ${rec.status} (${rec.response_time_ms}ms, ${rec.top_results.length} visible)`);

      // Scan filters once, on the first successful results page.
      if (!filtersScanned && rec.status === "success") {
        bundle.filters = await safe(() => scanFilters(page, target), bundle.filters);
        filtersScanned = true;
      }

      // Open the first public result once to audit a details page.
      if (!detailsScanned && rec.status === "success") {
        const first = rec.top_results.find((r) => r.opens_details_page && r.url && !r.requires_login);
        if (first) {
          try {
            const nav = await browser.goto(page, first.url, robots);
            if (!nav.blockedByRobots) {
              bundle.details.pages.push(await scanDetailsPage(page, target));
              bundle.legalTrust.records.push(await scanLegalTrust(page, target));
              bundle.knowledge = await safe(() => scanKnowledgeFeatures(page, target), bundle.knowledge);
              const shot = await shots.capture(page, target.id, "details", desktop.name);
              if (shot) bundle.pages.push(detailsAsPage(target, page.url(), shot));
              detailsScanned = true;
            }
          } catch (err) {
            notes.push(`Details page audit failed: ${(err as Error).message}`);
          }
        }
      }
      writeIncremental(options, bundle);
    }
  });

  // ---- MOBILE PASS (responsive perf + a11y comparison) --------------------
  if (mobile && !(safety.isBlocked(target.id) && options.stopOnBlock)) {
    await withPage(browser, mobile, async (page) => {
      try {
        const nav = await browser.goto(page, target.pages.home || target.baseUrl, robots);
        if (!nav.blockedByRobots) {
          bundle.performance.records.push(await scanPerformance(page, target, mobile.name));
          await shots.capture(page, target.id, "home-mobile", mobile.name);
          // mark filters mobile-friendliness optimistically if present
        }
      } catch (err) {
        notes.push(`Mobile pass failed: ${(err as Error).message}`);
      }
    });
  }

  bundle.blocked = bundle.blocked || safety.isBlocked(target.id);

  // ---- Scoring ------------------------------------------------------------
  try {
    bundle.scores = computeScores(bundle);
  } catch (err) {
    notes.push(`Scoring failed: ${(err as Error).message}`);
  }

  writeIncremental(options, bundle);
  log.ok(`Finished ${target.label}: search=${bundle.scores.search.total} ux=${bundle.scores.ux.total} trust=${bundle.scores.legal_trust.total} perf=${bundle.scores.performance.total}`);
  return bundle;
}

// ---------------------------------------------------------------------------
// Small orchestration helpers
// ---------------------------------------------------------------------------
async function withPage(
  browser: BrowserManager,
  viewport: ViewportSpec,
  fn: (page: import("playwright").Page) => Promise<void>
): Promise<void> {
  const { context, page } = await browser.newPage(viewport);
  try {
    await fn(page);
  } finally {
    await context.close().catch(() => undefined);
  }
}

/** Run a scanner, returning a fallback on failure (never throws). */
async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    log.warn(`scanner failed: ${(err as Error).message}`);
    return fallback;
  }
}

function purposeOf(key: string): string {
  const map: Record<string, string> = {
    home: "الصفحة الرئيسية",
    search: "صفحة البحث",
    systems: "صفحة الأنظمة/التشريعات",
    judgments: "صفحة الأحكام/السوابق",
    indexes: "صفحة الفهارس/التصنيفات",
    pricing: "صفحة الاشتراك/الأسعار",
    login: "تسجيل الدخول",
    register: "إنشاء حساب",
    help: "المساعدة",
    faq: "الأسئلة الشائعة",
    about: "من نحن",
    contact: "التواصل",
  };
  return map[key] || key;
}

function detectSubscription(key: string, bundle: TargetAuditBundle): void {
  const s = bundle.subscription;
  if (key === "login") s.has_login_page = true;
  if (key === "register") s.has_register_page = true;
  if (key === "pricing") {
    s.has_pricing_page = true;
    s.has_plans = true;
    s.clear_cta = true;
  }
}

function detailsAsPage(target: TargetConfig, url: string, shot: string) {
  return {
    target: target.id,
    page_key: "details",
    title: "صفحة تفاصيل",
    url,
    purpose: "صفحة تفاصيل نتيجة (مادة/نظام/حكم)",
    main_elements: [],
    is_fully_arabic: true,
    is_rtl: true,
    layout_organised: true,
    visual_issues: [],
    broken_links: [],
    js_errors: [],
    network_errors: [],
    screenshot: shot,
    rating_1_5: 3,
    status: "success" as const,
    notes: "",
  };
}

/** Persist a per-target snapshot so partial results survive interruption. */
function writeIncremental(options: RunOptions, bundle: TargetAuditBundle): void {
  const dir = path.join(options.output, "_partial");
  writeJson(path.join(dir, `${bundle.target}.json`), bundle);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main(): Promise<void> {
  const options = parseArgs(process.argv);

  ensureDir(options.output);
  if (options.fresh) {
    log.warn("--fresh: removing previous reports in the output directory.");
    try {
      for (const f of fs.readdirSync(options.output)) {
        fs.rmSync(path.join(options.output, f), { recursive: true, force: true });
      }
    } catch {
      /* ignore */
    }
    ensureDir(options.output);
  }

  log.info("=".repeat(64));
  log.info("legal-search-audit — descriptive UX/search audit (no scraping).");
  log.info(`targets=${options.targets.join(",")} viewport=${options.viewport} delay=${options.delayMs}ms headless=${options.headless}`);
  log.info("Ethics: robots-aware, rate-limited, stops on captcha/block, visible data only.");
  log.info("=".repeat(64));

  const queries = loadQueries(options.queriesFile, options.maxQueries);
  if (queries.length === 0) {
    log.warn("No queries loaded — search probes will be skipped (page/UX audits still run).");
  } else {
    log.ok(`Loaded ${queries.length} legal queries.`);
  }

  const browser = new BrowserManager(options);
  const safety = new SafetyState();
  const shots = new Screenshotter(options);
  const reporter = new Reporter(options);

  const bundles: TargetAuditBundle[] = [];

  try {
    await browser.launch();
    for (const id of options.targets) {
      const target = TARGETS[id];
      if (!target) {
        log.warn(`Unknown target "${id}" — skipping. (Known: ${Object.keys(TARGETS).join(", ")})`);
        continue;
      }
      try {
        const bundle = await auditTarget(target, queries, options, browser, shots, safety);
        bundles.push(bundle);
      } catch (err) {
        // One target failing must not abort the whole run (§31).
        log.error(`Target "${id}" crashed: ${(err as Error).message}`);
        const partial = readJsonOr<TargetAuditBundle | null>(
          path.join(options.output, "_partial", `${id}.json`),
          null
        );
        if (partial) bundles.push(partial);
      }
      await sleep(options.delayMs);
    }
  } catch (err) {
    log.error(`Fatal: ${(err as Error).message}`);
  } finally {
    await browser.close();
  }

  if (bundles.length > 0) {
    reporter.writeAll(bundles);
    log.ok("Done. Open reports/report.html and reports/ux_report.html.");
  } else {
    log.error("No bundles produced — nothing to report.");
  }
}

main().catch((err) => {
  log.error(`Unhandled: ${err?.stack || err}`);
  process.exit(1);
});
