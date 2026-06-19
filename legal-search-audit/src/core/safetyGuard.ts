// ===========================================================================
// safetyGuard.ts — Enforces the ethical/legal constraints (§1 of the spec).
//
// Responsibilities:
//   * Detect captcha / block / login-wall / verification signals on a page.
//   * Provide a single decision point ("should we stop?").
//   * Track a global "blocked" flag per target so callers can abort early.
//
// This module NEVER attempts to bypass anything. When a wall is detected the
// only action is to STOP and record the observation.
// ===========================================================================

import { Page } from "playwright";
import { TargetConfig } from "../types";
import { log } from "./utils";

export interface BlockCheck {
  blocked: boolean;
  reason: string;
  kind: "captcha" | "block" | "login_required" | "verification" | "none";
}

const GENERIC_BLOCK_WORDS = [
  "captcha",
  "recaptcha",
  "hcaptcha",
  "are you a robot",
  "verify you are human",
  "verify you're human",
  "access denied",
  "forbidden",
  "rate limit",
  "too many requests",
  "unusual traffic",
  "تحقق من أنك",
  "لست روبوت",
  "تم حظر",
  "محاولات كثيرة",
  "طلبات كثيرة",
];

const LOGIN_WALL_WORDS = [
  "login to continue",
  "sign in to continue",
  "subscribe to view",
  "members only",
  "للمشتركين فقط",
  "سجل الدخول لمتابعة",
  "سجّل الدخول لمتابعة",
  "هذا المحتوى للمشتركين",
  "اشترك لعرض",
];

/**
 * Inspect the *currently loaded* page for block / login signals using visible
 * text and well-known third-party captcha iframes. Read-only, no interaction.
 */
export async function checkForBlock(
  page: Page,
  target: TargetConfig
): Promise<BlockCheck> {
  try {
    const bodyText = (
      (await page.locator("body").innerText({ timeout: 3000 }).catch(() => "")) ||
      ""
    )
      .toLowerCase()
      .slice(0, 5000); // cap the text we examine

    // 1) Captcha iframes (Google reCAPTCHA / hCaptcha / Cloudflare Turnstile).
    const captchaFrame = await page
      .locator(
        'iframe[src*="recaptcha"], iframe[src*="hcaptcha"], iframe[src*="turnstile"], iframe[title*="captcha" i]'
      )
      .count()
      .catch(() => 0);
    if (captchaFrame > 0) {
      return {
        blocked: true,
        kind: "captcha",
        reason: "Captcha iframe detected on page.",
      };
    }

    // 2) Target-specific configured signals.
    const targetSignals = (target.blockSignals || []).map((s) =>
      s.toLowerCase()
    );
    for (const w of targetSignals) {
      if (w && bodyText.includes(w)) {
        return {
          blocked: true,
          kind: "block",
          reason: `Target block signal matched: "${w}".`,
        };
      }
    }

    // 3) Generic block words.
    for (const w of GENERIC_BLOCK_WORDS) {
      if (bodyText.includes(w)) {
        return {
          blocked: true,
          kind: w.includes("captcha") ? "captcha" : "block",
          reason: `Block phrase matched: "${w}".`,
        };
      }
    }

    // 4) Login wall (treated as login_required, not a hard block).
    for (const w of LOGIN_WALL_WORDS) {
      if (bodyText.includes(w)) {
        return {
          blocked: false,
          kind: "login_required",
          reason: `Login/subscription wall phrase matched: "${w}".`,
        };
      }
    }

    return { blocked: false, kind: "none", reason: "" };
  } catch (err) {
    return { blocked: false, kind: "none", reason: "" };
  }
}

/**
 * Check an HTTP status code for hard blocks (403/429/503 with retry-after).
 */
export function statusIsBlock(status: number): BlockCheck {
  if (status === 403)
    return { blocked: true, kind: "block", reason: "HTTP 403 Forbidden." };
  if (status === 429)
    return {
      blocked: true,
      kind: "block",
      reason: "HTTP 429 Too Many Requests.",
    };
  return { blocked: false, kind: "none", reason: "" };
}

/** Per-target safety state shared across scanners. */
export class SafetyState {
  private blockedTargets = new Set<string>();

  markBlocked(targetId: string, reason: string): void {
    if (!this.blockedTargets.has(targetId)) {
      log.block(`[${targetId}] ${reason} — stopping further requests to this target.`);
    }
    this.blockedTargets.add(targetId);
  }

  isBlocked(targetId: string): boolean {
    return this.blockedTargets.has(targetId);
  }
}
