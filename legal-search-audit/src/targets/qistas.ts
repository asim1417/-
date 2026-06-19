// ===========================================================================
// targets/qistas.ts — Target definition for "قسطاس" (qistas.com/ar).
//
// Edit URLs and selectors here. Empty selector strings mean "use heuristics".
// Verify the search route and selectors against the live site before a serious
// run; the scanners degrade gracefully (fall back to typing in the live box).
// ===========================================================================

import { TargetConfig } from "../types";

const qistas: TargetConfig = {
  id: "qistas",
  label: "قسطاس",
  baseUrl: "https://qistas.com/ar/",
  searchUrl: "https://qistas.com/ar/search?q={q}",
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
    home: "https://qistas.com/ar/",
    search: "https://qistas.com/ar/search",
    about: "https://qistas.com/ar/about",
    contact: "https://qistas.com/ar/contact",
    pricing: "https://qistas.com/ar/pricing",
    login: "https://qistas.com/ar/login",
    register: "https://qistas.com/ar/register",
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

export default qistas;
