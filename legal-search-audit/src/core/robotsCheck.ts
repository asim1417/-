// ===========================================================================
// robotsCheck.ts — Fetches and parses robots.txt, and answers "may we fetch
// this URL?" for our declared user-agent (§1.2). When robots.txt cannot be
// retrieved we DEFAULT TO CAUTION but still proceed for plainly public pages,
// logging the uncertainty. We never fetch a path that is explicitly Disallowed.
// ===========================================================================

import { request as pwRequest } from "playwright";
import { log } from "./utils";

interface RobotsRule {
  type: "allow" | "disallow";
  path: string;
}

interface RobotsGroup {
  userAgents: string[];
  rules: RobotsRule[];
}

export class RobotsTxt {
  private groups: RobotsGroup[] = [];
  private sitemaps: string[] = [];
  public available = false;
  public raw = "";

  constructor(public readonly origin: string) {}

  /** Fetch robots.txt for the given origin. Never throws. */
  static async load(origin: string, uaSuffix: string): Promise<RobotsTxt> {
    const robots = new RobotsTxt(origin);
    const url = new URL("/robots.txt", origin).toString();
    try {
      const ctx = await pwRequest.newContext({
        userAgent: `Mozilla/5.0 ${uaSuffix}`,
        timeout: 15000,
      });
      const res = await ctx.get(url);
      if (res.ok()) {
        robots.raw = await res.text();
        robots.parse(robots.raw);
        robots.available = true;
        log.ok(`robots.txt loaded for ${origin}`);
      } else {
        log.warn(`robots.txt not available for ${origin} (HTTP ${res.status()}). Proceeding cautiously on public pages only.`);
      }
      await ctx.dispose();
    } catch (err) {
      log.warn(`Could not fetch robots.txt for ${origin}: ${(err as Error).message}`);
    }
    return robots;
  }

  private parse(text: string): void {
    let current: RobotsGroup | null = null;
    const lines = text.split(/\r?\n/);
    for (let line of lines) {
      const hash = line.indexOf("#");
      if (hash >= 0) line = line.slice(0, hash);
      line = line.trim();
      if (!line) continue;
      const colon = line.indexOf(":");
      if (colon < 0) continue;
      const field = line.slice(0, colon).trim().toLowerCase();
      const value = line.slice(colon + 1).trim();

      if (field === "user-agent") {
        if (current && current.rules.length === 0) {
          // consecutive UA lines share a group
          current.userAgents.push(value.toLowerCase());
        } else {
          current = { userAgents: [value.toLowerCase()], rules: [] };
          this.groups.push(current);
        }
      } else if (field === "disallow" && current) {
        current.rules.push({ type: "disallow", path: value });
      } else if (field === "allow" && current) {
        current.rules.push({ type: "allow", path: value });
      } else if (field === "sitemap") {
        this.sitemaps.push(value);
      }
    }
  }

  getSitemaps(): string[] {
    return this.sitemaps.slice();
  }

  /**
   * Decide if a path is allowed for our agent. We match the "*" group (and any
   * group whose UA token appears in our UA string). Longest-match wins; Allow
   * beats Disallow on ties (standard robots semantics).
   */
  isAllowed(pathname: string, ua = "legal-search-audit"): boolean {
    if (!this.available) return true; // unknown → allow public pages, logged elsewhere

    const applicable = this.groups.filter((g) =>
      g.userAgents.some(
        (u) => u === "*" || ua.toLowerCase().includes(u) || u.includes("legal-search-audit")
      )
    );
    const groups = applicable.length > 0 ? applicable : this.groups.filter((g) => g.userAgents.includes("*"));
    if (groups.length === 0) return true;

    let bestLen = -1;
    let decision = true; // default allow
    for (const g of groups) {
      for (const rule of g.rules) {
        if (rule.path === "") continue;
        if (this.pathMatches(pathname, rule.path)) {
          const len = rule.path.length;
          if (len > bestLen || (len === bestLen && rule.type === "allow")) {
            bestLen = len;
            decision = rule.type === "allow";
          }
        }
      }
    }
    return decision;
  }

  private pathMatches(pathname: string, pattern: string): boolean {
    // Support "*" wildcard and "$" end-anchor (common robots extensions).
    let regex = "^";
    for (const ch of pattern) {
      if (ch === "*") regex += ".*";
      else if (ch === "$") regex += "$";
      else regex += ch.replace(/[.+?^${}()|[\]\\]/g, "\\$&");
    }
    try {
      return new RegExp(regex).test(pathname);
    } catch {
      return pathname.startsWith(pattern);
    }
  }
}
