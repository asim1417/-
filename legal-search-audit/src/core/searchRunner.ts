// ===========================================================================
// searchRunner.ts — Executes one query against one target and returns a fully
// populated SearchResultRecord (§7). Strategy:
//   1. Prefer the configured search URL (a normal, user-visible navigation).
//   2. If that yields nothing, fall back to typing into the live search box
//      and pressing Enter — exactly what a human would do.
// Measures response time, captures errors + screenshot, and enforces safety.
// ===========================================================================

import { Page } from "playwright";
import {
  LegalQuery,
  SearchResultRecord,
  SearchStatus,
  TargetConfig,
  SearchProbeType,
} from "../types";
import { buildSearchUrl } from "../config";
import { BrowserManager, getDiagnostics } from "./browser";
import { RobotsTxt } from "./robotsCheck";
import { parseResults, scoreRelevance } from "./resultParser";
import { checkForBlock, SafetyState, statusIsBlock } from "./safetyGuard";
import { Screenshotter } from "./screenshot";
import { findSearchInput } from "./searchBoxScanner";
import { log } from "./utils";

export async function runQuery(
  page: Page,
  browser: BrowserManager,
  robots: RobotsTxt | null,
  target: TargetConfig,
  query: LegalQuery,
  shots: Screenshotter,
  safety: SafetyState
): Promise<SearchResultRecord> {
  const probe = query.probe_type || inferProbeType(query);
  const record: SearchResultRecord = {
    target: target.id,
    query_id: query.id,
    query: query.query,
    category: query.category,
    probe_type: probe,
    timestamp: new Date().toISOString(),
    search_url: "",
    status: "error",
    response_time_ms: 0,
    results_count_visible: 0,
    top_results: [],
    filters_detected: [],
    screenshots: [],
    console_errors: [],
    network_errors: [],
    notes: "",
  };

  if (safety.isBlocked(target.id)) {
    record.status = "blocked";
    record.notes = "Skipped — target previously flagged as blocked.";
    return record;
  }

  const searchUrl = buildSearchUrl(target, query.query);
  record.search_url = searchUrl;
  const t0 = Date.now();

  try {
    // --- Strategy 1: direct search URL navigation -------------------------
    const nav = await browser.goto(page, searchUrl, robots);
    record.response_time_ms = Date.now() - t0;

    if (nav.blockedByRobots) {
      record.status = "blocked";
      record.notes = "robots.txt disallowed the search URL.";
      return finalize(record, page, shots, target, query);
    }

    const statusBlock = statusIsBlock(nav.status);
    if (statusBlock.blocked) {
      safety.markBlocked(target.id, statusBlock.reason);
      record.status = "blocked";
      record.notes = statusBlock.reason;
      return finalize(record, page, shots, target, query);
    }

    let block = await checkForBlock(page, target);
    if (block.blocked) {
      safety.markBlocked(target.id, block.reason);
      record.status = "blocked";
      record.notes = block.reason;
      return finalize(record, page, shots, target, query);
    }
    if (block.kind === "login_required") {
      record.status = "login_required";
      record.notes = block.reason;
    }

    // Parse results from the direct navigation.
    let parsed = await parseResults(page, target);

    // --- Strategy 2: fall back to typing in the live search box -----------
    if (parsed.items.length === 0 && nav.ok) {
      const typed = await typeAndSearch(page, target, query.query, browser);
      if (typed) {
        record.response_time_ms = Date.now() - t0;
        block = await checkForBlock(page, target);
        if (block.blocked) {
          safety.markBlocked(target.id, block.reason);
          record.status = "blocked";
          record.notes = block.reason;
          return finalize(record, page, shots, target, query);
        }
        parsed = await parseResults(page, target);
        record.search_url = page.url();
      }
    }

    // Score relevance of each visible result against the query.
    parsed.items.forEach((it) => {
      it.relevance_score_auto = Number(scoreRelevance(it, query.query).toFixed(2));
    });

    record.top_results = parsed.items;
    record.results_count_visible = parsed.visibleCount;
    record.filters_detected = parsed.filters;

    if (record.status !== "login_required") {
      record.status = parsed.items.length > 0 ? "success" : "no_results";
    }
  } catch (err) {
    record.status = "error";
    record.notes = `Exception: ${(err as Error).message}`;
    log.warn(`[${target.id}] query "${query.query}" errored: ${(err as Error).message}`);
  }

  return finalize(record, page, shots, target, query);
}

/** Locate the search input, type the query, and submit (Enter or button). */
async function typeAndSearch(
  page: Page,
  target: TargetConfig,
  query: string,
  browser: BrowserManager
): Promise<boolean> {
  const input = await findSearchInput(page, target);
  if (!input) return false;
  try {
    await input.click({ timeout: 5000 });
    await input.fill("");
    await input.type(query, { delay: 25 });
    // Prefer a configured/visible button; otherwise press Enter.
    const btnSel = target.selectors.searchButton;
    if (btnSel) {
      const btn = page.locator(btnSel).first();
      if ((await btn.count()) > 0) {
        await btn.click({ timeout: 5000 }).catch(() => undefined);
      } else {
        await input.press("Enter");
      }
    } else {
      await input.press("Enter");
    }
    await page
      .waitForLoadState("networkidle", { timeout: 8000 })
      .catch(() => undefined);
    return true;
  } catch {
    return false;
  }
}

function finalize(
  record: SearchResultRecord,
  page: Page,
  shots: Screenshotter,
  target: TargetConfig,
  query: LegalQuery
): SearchResultRecord {
  const diag = getDiagnostics(page);
  record.console_errors = diag.consoleErrors.slice(0, 20);
  record.network_errors = diag.networkErrors.slice(0, 20);
  return record;
}

/** Capture a screenshot for a search and attach it (called by orchestrator). */
export async function attachSearchScreenshot(
  page: Page,
  shots: Screenshotter,
  target: TargetConfig,
  query: LegalQuery,
  record: SearchResultRecord
): Promise<void> {
  const shot = await shots.capture(page, target.id, `search-${query.id}`);
  if (shot) record.screenshots.push(shot);
}

/** Infer the probe type from query text when not provided in the CSV. */
export function inferProbeType(query: LegalQuery): SearchProbeType {
  const q = query.query;
  if (/[؟?]/.test(q) || /^(هل|متى|كيف|ما|لماذا|أين|من)\b/.test(q.trim()))
    return "natural_question";
  if (/(ماده|مادة)\s*[\d٠-٩]+/.test(q) || /[\d٠-٩]+/.test(q)) {
    if (/[٠-٩]/.test(q)) return "numerals";
    return "article_number";
  }
  return "literal";
}
