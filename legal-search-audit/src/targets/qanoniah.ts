// ===========================================================================
// targets/qanoniah.ts — Target definition for "قانونية" (qanoniah.com).
//
// Edit URLs and selectors here. Empty selector strings mean "use heuristics".
// Verify the search route and selectors against the live site before a serious
// run; the scanners degrade gracefully (fall back to typing in the live box).
// ===========================================================================

import { TargetConfig } from "../types";

const qanoniah: TargetConfig = {
  id: "qanoniah",
  label: "قانونية",
  baseUrl: "https://qanoniah.com/",
  // {q} is replaced with the URL-encoded query.
  searchUrl: "https://qanoniah.com/search?q={q}",
  selectors: {
    searchInput: "",
    searchButton: "",
    resultsContainer: "",
    resultItem: "",
    resultTitle: "",
    resultSnippet: "",
    resultLink: "",
    filtersPanel: "",
    suggestionsBox: "",
    clearButton: "",
    advancedSearch: "",
    paginationContainer: "",
  },
  pages: {
    home: "https://qanoniah.com/",
    search: "https://qanoniah.com/search",
    about: "https://qanoniah.com/about",
    contact: "https://qanoniah.com/contact",
    pricing: "https://qanoniah.com/pricing",
    login: "https://qanoniah.com/login",
    register: "https://qanoniah.com/register",
  },
  blockSignals: [
    "captcha",
    "verify you are human",
    "تحقق",
    "أنت لست روبوت",
    "access denied",
    "rate limit",
    "تم حظر",
    "403 forbidden",
  ],
  notes:
    "Routes are best-effort guesses; adjust searchUrl/pages once verified against the live site.",
};

export default qanoniah;
