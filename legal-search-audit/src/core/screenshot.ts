// ===========================================================================
// screenshot.ts — Captures full-page screenshots into reports/screenshots/.
// Honours the --saveScreenshots flag. Never throws (a failed screenshot must
// not abort an audit).
// ===========================================================================

import { Page } from "playwright";
import * as path from "path";
import { RunOptions } from "../types";
import { ensureDir, log, slug } from "./utils";

export class Screenshotter {
  private dir: string;

  constructor(private readonly options: RunOptions) {
    this.dir = path.join(options.output, "screenshots");
    if (options.saveScreenshots) ensureDir(this.dir);
  }

  /**
   * Capture a full-page PNG. Returns the relative path (for embedding in HTML
   * reports) or null when screenshots are disabled / failed.
   */
  async capture(
    page: Page,
    target: string,
    label: string,
    viewport = "desktop"
  ): Promise<string | null> {
    if (!this.options.saveScreenshots) return null;
    const fileName = `${slug(target, 20)}__${slug(label, 40)}__${viewport}.png`;
    const abs = path.join(this.dir, fileName);
    try {
      await page.screenshot({ path: abs, fullPage: true, timeout: 15000 });
      return path.join("screenshots", fileName);
    } catch (err) {
      log.warn(`Screenshot failed for ${target}/${label}: ${(err as Error).message}`);
      return null;
    }
  }
}
