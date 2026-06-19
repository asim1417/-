// ===========================================================================
// accessibilityScanner.ts — Lightweight a11y checks (§20) without external
// engines: alt text coverage, accessible names for buttons, labels for inputs,
// lang attribute, a contrast sampling pass, and focus-visibility heuristics.
// These are indicative signals — not a full WCAG audit.
// ===========================================================================

import { Page } from "playwright";
import { AccessibilityRecord, TargetConfig } from "../types";

export async function scanAccessibility(
  page: Page,
  target: TargetConfig
): Promise<AccessibilityRecord> {
  const url = page.url();

  const d = await page.evaluate(() => {
    const issues: string[] = [];

    // Images / alt.
    const imgs = Array.from(document.querySelectorAll("img"));
    const imgsWithAlt = imgs.filter((i) => i.hasAttribute("alt"));

    // Buttons / accessible name.
    const buttons = Array.from(
      document.querySelectorAll("button, [role='button'], a[href]")
    );
    const buttonsNamed = buttons.filter((b) => {
      const name =
        (b.getAttribute("aria-label") || "") +
        (b.getAttribute("title") || "") +
        (b.textContent || "").trim();
      return name.trim().length > 0;
    });

    // Inputs / labels.
    const inputs = Array.from(
      document.querySelectorAll("input, select, textarea")
    ).filter((i) => (i as HTMLInputElement).type !== "hidden");
    const inputsLabeled = inputs.filter((i) => {
      const id = i.getAttribute("id");
      const hasFor = id && document.querySelector(`label[for='${CSS.escape(id)}']`);
      const wrapped = i.closest("label");
      const aria = i.getAttribute("aria-label") || i.getAttribute("aria-labelledby");
      const placeholder = i.getAttribute("placeholder");
      return !!(hasFor || wrapped || aria || placeholder);
    });

    // Lang.
    const lang = document.documentElement.getAttribute("lang") || "";

    // Contrast sampling: check a sample of text nodes' colour vs background.
    const parseRgb = (s: string): [number, number, number] | null => {
      const m = s.match(/rgba?\(([^)]+)\)/);
      if (!m) return null;
      const parts = m[1].split(",").map((x) => parseFloat(x));
      return [parts[0], parts[1], parts[2]];
    };
    const lum = (rgb: [number, number, number]) => {
      const a = rgb.map((v) => {
        const c = v / 255;
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
      });
      return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
    };
    const contrast = (fg: string, bg: string): number | null => {
      const f = parseRgb(fg);
      const b = parseRgb(bg);
      if (!f || !b) return null;
      const L1 = lum(f) + 0.05;
      const L2 = lum(b) + 0.05;
      return L1 > L2 ? L1 / L2 : L2 / L1;
    };
    const bgOf = (el: Element): string => {
      let cur: Element | null = el;
      while (cur) {
        const bg = window.getComputedStyle(cur).backgroundColor;
        if (bg && bg !== "rgba(0, 0, 0, 0)" && bg !== "transparent") return bg;
        cur = cur.parentElement;
      }
      return "rgb(255, 255, 255)";
    };

    const textEls = Array.from(
      document.querySelectorAll("p, span, a, li, h1, h2, h3, h4, button, label")
    )
      .filter((el) => (el.textContent || "").trim().length > 4)
      .slice(0, 40);
    let checked = 0;
    let low = 0;
    for (const el of textEls) {
      const style = window.getComputedStyle(el);
      const ratio = contrast(style.color, bgOf(el));
      if (ratio !== null) {
        checked++;
        if (ratio < 4.5) low++;
      }
    }

    // Focus visibility heuristic: does any :focus rule / outline exist?
    let focusVisible = false;
    try {
      for (const sheet of Array.from(document.styleSheets)) {
        let rules: CSSRuleList | null = null;
        try {
          rules = (sheet as CSSStyleSheet).cssRules;
        } catch {
          continue; // cross-origin sheet
        }
        if (!rules) continue;
        for (const rule of Array.from(rules)) {
          if (/:focus(-visible)?/.test((rule as CSSStyleRule).selectorText || "")) {
            focusVisible = true;
            break;
          }
        }
        if (focusVisible) break;
      }
    } catch {
      /* ignore */
    }

    const focusable = document.querySelectorAll(
      "a[href], button, input, select, textarea, [tabindex]:not([tabindex='-1'])"
    ).length;

    if (imgs.length > 0 && imgsWithAlt.length / imgs.length < 0.8)
      issues.push("Many images lack alt text.");
    if (buttons.length > 0 && buttonsNamed.length / buttons.length < 0.9)
      issues.push("Some buttons/links lack an accessible name.");
    if (inputs.length > 0 && inputsLabeled.length / inputs.length < 0.9)
      issues.push("Some form inputs lack labels.");
    if (!lang) issues.push("Missing <html lang> attribute.");
    if (checked > 0 && low / checked > 0.2)
      issues.push("Several text samples may have insufficient colour contrast.");
    if (!focusVisible) issues.push("No explicit :focus styling detected.");

    return {
      imgs: imgs.length,
      imgsWithAlt: imgsWithAlt.length,
      buttons: buttons.length,
      buttonsNamed: buttonsNamed.length,
      inputs: inputs.length,
      inputsLabeled: inputsLabeled.length,
      checked,
      low,
      lang,
      focusVisible,
      focusable,
      issues,
    };
  });

  return {
    target: target.id,
    url,
    images_total: d.imgs,
    images_with_alt: d.imgsWithAlt,
    buttons_total: d.buttons,
    buttons_with_accessible_name: d.buttonsNamed,
    inputs_total: d.inputs,
    inputs_with_label: d.inputsLabeled,
    low_contrast_samples: d.low,
    contrast_samples_checked: d.checked,
    has_lang_attribute: !!d.lang,
    lang_value: d.lang,
    has_visible_focus: d.focusVisible,
    keyboard_focusable_count: d.focusable,
    issues: d.issues,
    notes: "",
  };
}
