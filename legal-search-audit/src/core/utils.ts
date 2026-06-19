// ===========================================================================
// utils.ts — Small, dependency-free helpers shared across scanners.
//   * filesystem (incremental JSON/CSV writers so results survive crashes)
//   * Arabic text normalisation (hamza / diacritics / numerals)
//   * a minimal CSV parser (no external dependency)
//   * console progress logging
// ===========================================================================

import * as fs from "fs";
import * as path from "path";

// --------------------------------------------------------------------------
// Console logging with light prefixes (printed to terminal — §32 "progress").
// --------------------------------------------------------------------------
export const log = {
  info: (msg: string) => console.log(`ℹ️  ${msg}`),
  step: (msg: string) => console.log(`➡️  ${msg}`),
  ok: (msg: string) => console.log(`✅ ${msg}`),
  warn: (msg: string) => console.warn(`⚠️  ${msg}`),
  error: (msg: string) => console.error(`❌ ${msg}`),
  block: (msg: string) =>
    console.warn(`🛑 BLOCK/CAPTCHA DETECTED — ${msg}`),
};

/** Promise-based sleep. */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Recursively ensure a directory exists. */
export function ensureDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
}

/** Write JSON to disk atomically-ish (write then rename). Used incrementally
 *  so partial results are preserved if the run is interrupted (§32). */
export function writeJson(filePath: string, data: unknown): void {
  ensureDir(path.dirname(filePath));
  const tmp = `${filePath}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), "utf8");
  fs.renameSync(tmp, filePath);
}

/** Read JSON if it exists, else return the fallback. */
export function readJsonOr<T>(filePath: string, fallback: T): T {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
    }
  } catch {
    /* ignore malformed file */
  }
  return fallback;
}

/** Write a CSV given headers and rows of records. */
export function writeCsv(
  filePath: string,
  headers: string[],
  rows: Array<Record<string, unknown>>
): void {
  ensureDir(path.dirname(filePath));
  const lines = [headers.map(csvCell).join(",")];
  for (const row of rows) {
    lines.push(headers.map((h) => csvCell(row[h])).join(","));
  }
  fs.writeFileSync(filePath, lines.join("\n") + "\n", "utf8");
}

function csvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (/[",\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/**
 * Minimal CSV parser supporting quoted fields, escaped quotes and newlines
 * inside quotes. Returns an array of row objects keyed by header.
 */
export function parseCsv(content: string): Array<Record<string, string>> {
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;

  // Strip BOM if present.
  if (content.charCodeAt(0) === 0xfeff) content = content.slice(1);

  for (let i = 0; i < content.length; i++) {
    const c = content[i];
    if (inQuotes) {
      if (c === '"') {
        if (content[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else {
      if (c === '"') {
        inQuotes = true;
      } else if (c === ",") {
        row.push(field);
        field = "";
      } else if (c === "\n") {
        row.push(field);
        rows.push(row);
        row = [];
        field = "";
      } else if (c === "\r") {
        // ignore — handled with \n
      } else {
        field += c;
      }
    }
  }
  // last field / row
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  if (rows.length === 0) return [];
  const headers = rows[0].map((h) => h.trim());
  const out: Array<Record<string, string>> = [];
  for (let r = 1; r < rows.length; r++) {
    if (rows[r].length === 1 && rows[r][0].trim() === "") continue; // blank line
    const obj: Record<string, string> = {};
    headers.forEach((h, idx) => {
      obj[h] = (rows[r][idx] ?? "").trim();
    });
    out.push(obj);
  }
  return out;
}

// --------------------------------------------------------------------------
// Arabic-aware text helpers
// --------------------------------------------------------------------------

const ARABIC_DIACRITICS = /[ؗ-ًؚ-ْٰـ]/g; // tashkeel + tatweel

/** Convert Eastern-Arabic (Hindi) digits to Western digits. */
export function normalizeDigits(input: string): string {
  const map: Record<string, string> = {
    "٠": "0", "١": "1", "٢": "2", "٣": "3", "٤": "4",
    "٥": "5", "٦": "6", "٧": "7", "٨": "8", "٩": "9",
  };
  return input.replace(/[٠-٩]/g, (d) => map[d] ?? d);
}

/**
 * Normalise Arabic text for fuzzy comparison: unify hamza/alef forms, drop
 * diacritics, normalise ta-marbuta and alef-maqsura, collapse whitespace.
 * Used ONLY for relevance scoring of *visible* titles vs the query — never to
 * reconstruct content.
 */
export function normalizeArabic(input: string): string {
  if (!input) return "";
  let s = input;
  s = s.replace(ARABIC_DIACRITICS, "");
  s = s.replace(/[إأآا]/g, "ا"); // alef forms
  s = s.replace(/ى/g, "ي"); // alef maqsura -> ya
  s = s.replace(/ؤ/g, "و");
  s = s.replace(/ئ/g, "ي");
  s = s.replace(/ة/g, "ه"); // ta marbuta -> ha
  s = normalizeDigits(s);
  s = s.replace(/\s+/g, " ").trim();
  return s.toLowerCase();
}

/** Tokenise normalised Arabic/Latin text into words (length >= 2). */
export function tokens(input: string): string[] {
  return normalizeArabic(input)
    .split(/[^\p{L}\p{N}]+/u)
    .filter((t) => t.length >= 2);
}

/** Does the text contain an Arabic "article number" pattern (مادة \d+)? */
export function hasArticleNumber(text: string): boolean {
  const n = normalizeDigits(text);
  return /(?:ماده|مادة|الماده|المادة)\s*\(?\s*\d+/.test(normalizeArabic(text)) ||
    /\b(?:ماده|مادة)\b.*\d+/.test(n) ||
    /مادة\s*\d+/.test(n);
}

/** Heuristic: does text mention a "نظام/لائحة" (system/regulation) name? */
export function hasSystemName(text: string): boolean {
  return /(نظام|لائحة|اللائحة|النظام|قانون|مرسوم|أمر ملكي|أمر سامي)/.test(
    text
  );
}

/** Slug a string for safe filenames. */
export function slug(input: string, max = 60): string {
  const base = normalizeArabic(input)
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, max);
  return base || "x";
}

/** Clamp a number to a range. */
export function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

/** Round to N decimals. */
export function round(n: number, decimals = 1): number {
  const f = Math.pow(10, decimals);
  return Math.round(n * f) / f;
}

/** Average of numbers (0 if empty). */
export function avg(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

/** Truncate a snippet so we never store large blocks of legal text (§1). */
export function truncateSnippet(text: string, maxChars = 220): string {
  const clean = (text || "").replace(/\s+/g, " ").trim();
  if (clean.length <= maxChars) return clean;
  return clean.slice(0, maxChars) + "…";
}

/** Retry an async fn ONCE on failure (§31: "retry محدود مرة واحدة"). */
export async function retryOnce<T>(
  fn: () => Promise<T>,
  onRetry?: (err: unknown) => void
): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (onRetry) onRetry(err);
    return await fn();
  }
}
