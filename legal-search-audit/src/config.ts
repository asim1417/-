// ===========================================================================
// config.ts — All editable URLs, selectors and run defaults live here.
//
// IMPORTANT: No selector is hard-coded inside the scanning logic. Every scanner
// reads selectors from here and falls back to robust heuristics (visible text,
// aria-label, role, placeholder) when a selector is missing or unstable.
//
// To add a NEW target: add an entry to TARGETS below — nothing else changes.
// ===========================================================================

import { TargetConfig, ViewportSpec, RunOptions } from "./types";
import qanoniah from "./targets/qanoniah";
import qistas from "./targets/qistas";

/** Responsive viewport profiles (§18). */
export const VIEWPORTS: ViewportSpec[] = [
  { name: "desktop", width: 1440, height: 900, isMobile: false },
  { name: "laptop", width: 1280, height: 800, isMobile: false },
  { name: "tablet", width: 768, height: 1024, isMobile: true },
  { name: "mobile", width: 390, height: 844, isMobile: true },
];

/** Resolve which viewports to use for a given --viewport mode. */
export function resolveViewports(mode: string): ViewportSpec[] {
  if (mode === "all") return VIEWPORTS;
  if (mode === "mobile") return VIEWPORTS.filter((v) => v.isMobile);
  // default: desktop set (desktop + laptop)
  return VIEWPORTS.filter((v) => !v.isMobile);
}

/**
 * Target definitions. Selectors are intentionally conservative; the parser
 * uses heuristics when these are empty, so an empty string is a valid value
 * meaning "let the heuristic engine decide".
 */
export const TARGETS: Record<string, TargetConfig> = {
  qanoniah,
  qistas,
};

/** Build a search URL for a target, honouring a custom builder if present. */
export function buildSearchUrl(target: TargetConfig, query: string): string {
  if (target.buildSearchUrl) return target.buildSearchUrl(query);
  return target.searchUrl.replace("{q}", encodeURIComponent(query));
}

/** Default run options. CLI flags and env vars override these. */
export const DEFAULT_OPTIONS: RunOptions = {
  targets: ["qanoniah", "qistas"],
  queriesFile: "./data/legal_queries.csv",
  headless: envBool("HEADLESS", true),
  output: "./reports",
  maxQueries: null,
  saveScreenshots: envBool("SAVE_SCREENSHOTS", true),
  viewport: "desktop",
  // Polite default: ~7s between requests (spec asks for 5–10s).
  delayMs: envNum("DELAY_MS", 7000),
  stopOnBlock: envBool("STOP_ON_BLOCK", true),
  pageTimeoutMs: envNum("PAGE_TIMEOUT_MS", 45000),
  uaSuffix:
    process.env.UA_SUFFIX ||
    "legal-search-audit/1.0 (UX research; respectful low-rate)",
  fresh: false,
};

function envBool(key: string, fallback: boolean): boolean {
  const v = process.env[key];
  if (v === undefined) return fallback;
  return v === "true" || v === "1" || v === "yes";
}

function envNum(key: string, fallback: number): number {
  const v = process.env[key];
  if (v === undefined) return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}
