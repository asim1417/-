// ===========================================================================
// resultParser.ts — Extracts VISIBLE search-result metadata from a results
// page using configured selectors first, then robust DOM heuristics. We only
// read what a user sees: title, short snippet, link, source-type hint. We cap
// snippet length and number of results so we never harvest content (§1).
// ===========================================================================

import { Page } from "playwright";
import { TargetConfig, SearchResultItem } from "../types";
import {
  hasArticleNumber,
  hasSystemName,
  normalizeArabic,
  tokens,
  truncateSnippet,
} from "./utils";

const MAX_RESULTS = 5; // we only ever inspect the top few visible results

/** Raw item shape returned from the in-page evaluation. */
interface RawItem {
  title: string;
  snippet: string;
  url: string;
  hasHighlight: boolean;
}

/**
 * Try to locate and read result items. Returns up to MAX_RESULTS visible items.
 */
export async function parseResults(
  page: Page,
  target: TargetConfig
): Promise<{ items: SearchResultItem[]; visibleCount: number; filters: string[] }> {
  const sel = target.selectors;

  const raw = await page.evaluate(
    (args: { resultItem: string; resultTitle: string; resultSnippet: string; resultLink: string; container: string; max: number }) => {
      const { resultItem, resultTitle, resultSnippet, resultLink, container, max } = args;

      const text = (el: Element | null): string =>
        (el?.textContent || "").replace(/\s+/g, " ").trim();

      const visible = (el: Element): boolean => {
        const r = (el as HTMLElement).getBoundingClientRect();
        const style = window.getComputedStyle(el as HTMLElement);
        return (
          r.width > 0 &&
          r.height > 0 &&
          style.visibility !== "hidden" &&
          style.display !== "none"
        );
      };

      // 1) Find candidate result nodes.
      let nodes: Element[] = [];
      if (resultItem) {
        nodes = Array.from(document.querySelectorAll(resultItem));
      }
      if (nodes.length === 0) {
        // Heuristic: within a results container (if any), find repeated blocks
        // that contain a heading + a link.
        const scope: ParentNode = container
          ? document.querySelector(container) || document
          : document;
        const candidates = Array.from(
          scope.querySelectorAll(
            "article, li, .result, .search-result, .card, [class*='result'], [class*='item']"
          )
        ).filter((el) => {
          const hasLink = el.querySelector("a[href]");
          const hasHeading = el.querySelector("h1,h2,h3,h4,a");
          return hasLink && hasHeading && visible(el);
        });
        // De-duplicate nested matches (keep outermost).
        nodes = candidates.filter(
          (el) => !candidates.some((other) => other !== el && other.contains(el))
        );
      }

      const out: Array<{ title: string; snippet: string; url: string; hasHighlight: boolean }> = [];
      const total = nodes.length;

      for (const node of nodes.slice(0, max)) {
        const titleEl =
          (resultTitle && node.querySelector(resultTitle)) ||
          node.querySelector("h1,h2,h3,h4") ||
          node.querySelector("a[href]");
        const linkEl =
          (resultLink && (node.querySelector(resultLink) as HTMLAnchorElement)) ||
          (node.querySelector("a[href]") as HTMLAnchorElement | null);

        let snippet = "";
        if (resultSnippet) {
          snippet = text(node.querySelector(resultSnippet));
        }
        if (!snippet) {
          // Use the node text minus the title as a rough snippet.
          const full = text(node);
          const t = text(titleEl);
          snippet = full.startsWith(t) ? full.slice(t.length).trim() : full;
        }

        const hasHighlight = !!node.querySelector(
          "mark, .highlight, .hl, em.search, b.match, [class*='highlight']"
        );

        out.push({
          title: text(titleEl).slice(0, 200),
          snippet: snippet.slice(0, 400),
          url: linkEl ? linkEl.href : "",
          hasHighlight,
        });
      }

      // Collect visible filter labels as a side-effect (cheap, useful for §16).
      const filterEls = Array.from(
        document.querySelectorAll(
          "[class*='filter'] label, [class*='facet'] label, aside label, [role='group'] label"
        )
      )
        .map((el) => text(el))
        .filter((t) => t.length > 0 && t.length < 40);

      return {
        items: out,
        total,
        filters: Array.from(new Set(filterEls)).slice(0, 30),
      };
    },
    {
      resultItem: sel.resultItem || "",
      resultTitle: sel.resultTitle || "",
      resultSnippet: sel.resultSnippet || "",
      resultLink: sel.resultLink || "",
      container: sel.resultsContainer || "",
      max: MAX_RESULTS,
    }
  );

  const items: SearchResultItem[] = (raw.items as RawItem[]).map((r, idx) =>
    enrich(r, idx + 1, target)
  );

  return { items, visibleCount: raw.total, filters: raw.filters };
}

/** Turn a raw visible item into a scored SearchResultItem (no full content). */
function enrich(raw: RawItem, rank: number, target: TargetConfig): SearchResultItem {
  const title = raw.title.trim();
  const snippet = truncateSnippet(raw.snippet);
  const url = raw.url;

  return {
    rank,
    title,
    source_type: guessSourceType(title, snippet, url),
    snippet,
    url,
    has_highlight: raw.hasHighlight,
    has_article_number: hasArticleNumber(title) || hasArticleNumber(snippet),
    has_system_name: hasSystemName(title) || hasSystemName(snippet),
    opens_details_page: isLikelyDetailsLink(url, target),
    requires_login: /login|signin|subscribe|اشترك|تسجيل/i.test(url),
    relevance_score_manual: null,
    relevance_score_auto: 0, // filled by scorer relative to the query
    notes: "",
  };
}

/** Crude source-type classifier from visible cues only. */
function guessSourceType(title: string, snippet: string, url: string): string {
  const t = `${title} ${snippet} ${url}`;
  if (/حكم|قضي|دائرة|محكمة|سابقة/.test(t)) return "judgment";
  if (/لائحة|اللائحة/.test(t)) return "regulation";
  if (/نظام|قانون|مرسوم|مادة|ماده/.test(t)) return "legislation";
  if (/مبدأ|مبادئ/.test(t)) return "principle";
  if (/مقال|تحليل|شرح/.test(t)) return "article";
  return "unknown";
}

function isLikelyDetailsLink(url: string, target: TargetConfig): boolean {
  if (!url) return false;
  try {
    const u = new URL(url);
    const base = new URL(target.baseUrl);
    if (u.host !== base.host) return false;
    // Details pages usually have a deeper path or an id.
    return /\/(\d+|[a-z0-9-]{6,})(\/|$)/i.test(u.pathname) || u.pathname.split("/").length > 2;
  } catch {
    return false;
  }
}

/** Compute an automatic 0–5 relevance score for an item against a query. */
export function scoreRelevance(item: SearchResultItem, query: string): number {
  const qTokens = new Set(tokens(query));
  if (qTokens.size === 0) return 0;
  const hay = normalizeArabic(`${item.title} ${item.snippet}`);
  const titleNorm = normalizeArabic(item.title);

  let hits = 0;
  for (const tk of qTokens) if (hay.includes(tk)) hits++;
  const coverage = hits / qTokens.size; // 0..1

  // Exact (normalised) query substring in the title is the strongest signal.
  const qNorm = normalizeArabic(query);
  const exactInTitle = titleNorm.includes(qNorm);

  let score = coverage * 4; // up to 4 for token coverage
  if (exactInTitle) score = Math.max(score, 4.5);
  if (item.has_article_number && /\d/.test(qNorm)) score += 0.3;
  if (item.has_system_name) score += 0.2;

  return Math.max(0, Math.min(5, score));
}
