// ===========================================================================
// iconScanner.ts — Inventories icons / icon-buttons (§10): location, likely
// function, whether meaning is clear (has tooltip/aria/text), size and touch
// suitability. Also flags icon-only buttons with no accessible name and
// duplicate icons used for different functions.
// ===========================================================================

import { Page } from "playwright";
import { IconAudit, IconRecord, TargetConfig } from "../types";

export async function scanIcons(
  page: Page,
  target: TargetConfig
): Promise<IconAudit> {
  const data = await page.evaluate(() => {
    const region = (el: Element): string => {
      if (el.closest("header, [role='banner']")) return "header";
      if (el.closest("nav, [role='navigation']")) return "nav";
      if (el.closest("footer, [role='contentinfo']")) return "footer";
      if (el.closest("aside, [class*='filter'], [class*='sidebar']")) return "sidebar/filters";
      if (el.closest("[class*='result'], [class*='card'], article")) return "results/cards";
      return "body";
    };

    const guessFunction = (el: Element): string => {
      const hay = (
        (el.getAttribute("aria-label") || "") +
        " " + (el.getAttribute("title") || "") +
        " " + (el.className || "") +
        " " + (el.textContent || "")
      ).toLowerCase();
      const has = (re: RegExp) => re.test(hay);
      if (has(/search|بحث|ابحث/)) return "search";
      if (has(/filter|فلتر|تصفية/)) return "filter";
      if (has(/save|bookmark|حفظ|مفضل/)) return "save/favourite";
      if (has(/share|مشارك/)) return "share";
      if (has(/copy|نسخ/)) return "copy";
      if (has(/print|طباعة/)) return "print";
      if (has(/pdf|download|تحميل|تنزيل/)) return "download/pdf";
      if (has(/user|account|حساب|مستخدم|profile/)) return "user/account";
      if (has(/notif|تنبيه|إشعار/)) return "notifications";
      if (has(/menu|قائمة|hamburger/)) return "menu";
      if (has(/arrow|سهم|chevron|next|prev|التالي|السابق/)) return "navigation arrow";
      if (has(/setting|إعداد/)) return "settings";
      if (has(/lang|لغة/)) return "language";
      if (has(/ai|ذكاء|مساعد/)) return "AI assistant";
      return "unknown";
    };

    // Candidate icon nodes: <svg>, <i class=fa/material>, icon-only buttons.
    const nodes = Array.from(
      document.querySelectorAll(
        "button svg, a svg, button i[class*='icon'], button i[class*='fa'], i[class*='material'], [class*='icon']"
      )
    ).slice(0, 120);

    const icons: any[] = [];
    const funcByVisual = new Map<string, Set<string>>();
    const iconlessButtons: string[] = [];

    const visible = (el: Element) => {
      const r = (el as HTMLElement).getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    };

    for (const el of nodes) {
      if (!visible(el)) continue;
      const btn = el.closest("button, a, [role='button']") || el;
      const aria = btn.getAttribute("aria-label") || "";
      const title = btn.getAttribute("title") || el.getAttribute("title") || "";
      const text = (btn.textContent || "").replace(/\s+/g, " ").trim();
      const r = (el as HTMLElement).getBoundingClientRect();
      const fn = guessFunction(btn);
      const hasName = !!(aria || title || text.length > 0);

      icons.push({
        location: region(el),
        expected_function: fn,
        meaning_clear: hasName || fn !== "unknown",
        has_tooltip: !!title,
        has_helper_text: text.length > 0,
        size_px: Math.round(Math.max(r.width, r.height)) || null,
        touch_friendly: Math.min(r.width, r.height) >= 40,
      });

      if (!hasName && text.length === 0) {
        const cls = (btn.className || "").toString().slice(0, 40);
        iconlessButtons.push(`${region(el)}: <button class="${cls}">`);
      }

      // Track duplicate visual (class signature) → functions.
      const sig = ((el.className || "").toString().match(/icon[-\w]*|fa-[\w-]+|material-icons/)?.[0]) || fn;
      if (!funcByVisual.has(sig)) funcByVisual.set(sig, new Set());
      funcByVisual.get(sig)!.add(fn);
    }

    const duplicates: string[] = [];
    funcByVisual.forEach((fns, sig) => {
      if (fns.size > 1) duplicates.push(`${sig} → {${Array.from(fns).join(", ")}}`);
    });

    return {
      icons: icons.slice(0, 60),
      duplicates: duplicates.slice(0, 20),
      iconlessButtons: Array.from(new Set(iconlessButtons)).slice(0, 20),
    };
  });

  const icons: IconRecord[] = data.icons.map((i: any) => ({
    location: i.location,
    expected_function: i.expected_function,
    meaning_clear: i.meaning_clear,
    has_tooltip: i.has_tooltip,
    has_helper_text: i.has_helper_text,
    size_px: i.size_px,
    touch_friendly: i.touch_friendly,
    notes: "",
  }));

  return {
    target: target.id,
    icons,
    duplicate_functions: data.duplicates,
    iconless_buttons: data.iconlessButtons,
    notes: `${icons.length} icons inventoried on the scanned page.`,
  };
}
