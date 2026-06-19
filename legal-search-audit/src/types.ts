// ===========================================================================
// types.ts — Shared TypeScript types for the legal-search-audit tool.
//
// These types describe the *observable, public* data the tool records. They
// intentionally model a UX/search audit — not a content extraction. We never
// model "full document text"; only short visible snippets and metadata.
// ===========================================================================

/** Identifier of a target platform. New targets can be added in config.ts. */
export type TargetId = string;

/** Viewport profiles used for responsive auditing. */
export type ViewportName = "desktop" | "laptop" | "tablet" | "mobile";

/** Which viewport set to run. */
export type ViewportMode = "desktop" | "mobile" | "all";

/** A single named viewport size. */
export interface ViewportSpec {
  name: ViewportName;
  width: number;
  height: number;
  isMobile: boolean;
}

/** The categories of search behaviour the audit probes. */
export type SearchProbeType =
  | "literal"
  | "article_number"
  | "natural_question"
  | "semantic"
  | "spelling"
  | "numerals"
  | "diacritics_hamza";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/** CSS / heuristic selectors for a target. All optional — the parser falls
 *  back to text/role/aria/placeholder heuristics when a selector is missing. */
export interface TargetSelectors {
  searchInput?: string;
  searchButton?: string;
  resultsContainer?: string;
  resultItem?: string;
  resultTitle?: string;
  resultSnippet?: string;
  resultLink?: string;
  resultSourceType?: string;
  filtersPanel?: string;
  filterItem?: string;
  suggestionsBox?: string;
  clearButton?: string;
  advancedSearch?: string;
  paginationContainer?: string;
}

/** Static, hand-curated public pages worth auditing for a target. */
export interface TargetPages {
  home?: string;
  search?: string;
  systems?: string; // الأنظمة / التشريعات
  judgments?: string; // الأحكام / السوابق
  indexes?: string; // الفهارس / التصنيفات
  pricing?: string; // الاشتراك / الأسعار
  login?: string;
  register?: string;
  help?: string;
  faq?: string;
  about?: string;
  contact?: string;
  [key: string]: string | undefined;
}

/** Full configuration for one target platform. */
export interface TargetConfig {
  id: TargetId;
  label: string; // human label, e.g. "قانونية"
  baseUrl: string;
  searchUrl: string; // a template; {q} is replaced by the URL-encoded query
  selectors: TargetSelectors;
  pages: TargetPages;
  /** Optional: how this target builds a search URL from a raw query. */
  buildSearchUrl?: (query: string) => string;
  /** Words that, if visible, suggest a block / captcha / login wall. */
  blockSignals?: string[];
  notes?: string;
}

/** Global run options (resolved from CLI + env + defaults). */
export interface RunOptions {
  targets: TargetId[];
  queriesFile: string;
  headless: boolean;
  output: string;
  maxQueries: number | null;
  saveScreenshots: boolean;
  viewport: ViewportMode;
  delayMs: number;
  stopOnBlock: boolean;
  pageTimeoutMs: number;
  uaSuffix: string;
  fresh: boolean; // wipe previous reports first
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export interface LegalQuery {
  id: string;
  category: string;
  query: string;
  expected_intent: string;
  expected_sources: string;
  notes: string;
  /** Optional probe type, inferred if absent. */
  probe_type?: SearchProbeType;
}

// ---------------------------------------------------------------------------
// Search results (the model from §7 of the spec)
// ---------------------------------------------------------------------------

export type SearchStatus =
  | "success"
  | "blocked"
  | "login_required"
  | "error"
  | "no_results";

export interface SearchResultItem {
  rank: number;
  title: string;
  source_type: string;
  snippet: string;
  url: string;
  has_highlight: boolean;
  has_article_number: boolean;
  has_system_name: boolean;
  opens_details_page: boolean;
  requires_login: boolean;
  relevance_score_manual: number | null;
  /** Heuristic 0–5 relevance vs the query, computed automatically. */
  relevance_score_auto: number;
  notes: string;
}

export interface SearchResultRecord {
  target: TargetId;
  query_id: string;
  query: string;
  category: string;
  probe_type: SearchProbeType;
  timestamp: string;
  search_url: string;
  status: SearchStatus;
  response_time_ms: number;
  results_count_visible: number;
  top_results: SearchResultItem[];
  filters_detected: string[];
  screenshots: string[];
  console_errors: string[];
  network_errors: string[];
  notes: string;
}

// ---------------------------------------------------------------------------
// UI / page audit (§8)
// ---------------------------------------------------------------------------

export interface PageAuditRecord {
  target: TargetId;
  page_key: string;
  title: string;
  url: string;
  purpose: string;
  main_elements: string[];
  is_fully_arabic: boolean;
  is_rtl: boolean;
  layout_organised: boolean;
  visual_issues: string[];
  broken_links: string[];
  js_errors: string[];
  network_errors: string[];
  screenshot: string | null;
  rating_1_5: number;
  status: SearchStatus;
  notes: string;
}

// ---------------------------------------------------------------------------
// Navigation (§9)
// ---------------------------------------------------------------------------

export interface NavTransitionRecord {
  target: TargetId;
  from_page: string;
  element_clicked: string;
  to_page: string;
  is_clear: boolean;
  has_loading_indicator: boolean;
  preserves_search_state: boolean;
  preserves_filters_on_back: boolean;
  url_is_shareable: boolean;
  mobile_friendly: boolean;
  notes: string;
}

export interface NavigationMap {
  target: TargetId;
  primary_menu: string[];
  footer_links: string[];
  has_breadcrumbs: boolean;
  has_pagination: boolean;
  transitions: NavTransitionRecord[];
  click_depth: Record<string, number | null>;
  notes: string;
}

// ---------------------------------------------------------------------------
// Icons (§10)
// ---------------------------------------------------------------------------

export interface IconRecord {
  location: string;
  expected_function: string;
  meaning_clear: boolean;
  has_tooltip: boolean;
  has_helper_text: boolean;
  size_px: number | null;
  touch_friendly: boolean;
  notes: string;
}

export interface IconAudit {
  target: TargetId;
  icons: IconRecord[];
  duplicate_functions: string[];
  iconless_buttons: string[];
  notes: string;
}

// ---------------------------------------------------------------------------
// Search box (§11) + related elements (§12)
// ---------------------------------------------------------------------------

export interface SearchBoxAudit {
  target: TargetId;
  found: boolean;
  location: string;
  placeholder: string;
  supports_arabic: boolean;
  supports_rtl: boolean;
  supports_long_query: boolean;
  supports_enter: boolean;
  has_search_button: boolean;
  has_live_search: boolean;
  has_autosuggest: boolean;
  has_spelling_suggestions: boolean;
  has_search_history: boolean;
  has_clear_button: boolean;
  has_advanced_search: boolean;
  has_source_type_selector: boolean;
  has_jurisdiction_selector: boolean;
  font_size_px: number | null;
  related_elements: RelatedSearchElement[];
  notes: string;
}

export interface RelatedSearchElement {
  name: string;
  appears_before_search: boolean;
  helps_user: boolean;
  works: boolean;
  adds_value: boolean;
  notes: string;
}

// ---------------------------------------------------------------------------
// Indexes (§13)
// ---------------------------------------------------------------------------

export interface IndexRecord {
  name: string;
  url: string;
  organisation: "alphabetical" | "thematic" | "chronological" | "mixed" | "unknown";
  has_internal_search: boolean;
  has_filters: boolean;
  shows_counts: boolean;
  expandable_subcategories: boolean;
  has_breadcrumb: boolean;
  has_tree: boolean;
  clicks_to_reach_article: number | null;
  suitable_for_legal_research: boolean;
  notes: string;
}

export interface IndexesAudit {
  target: TargetId;
  indexes: IndexRecord[];
  notes: string;
}

// ---------------------------------------------------------------------------
// Filters (§16)
// ---------------------------------------------------------------------------

export interface FilterRecord {
  name: string;
  location: string;
  clearly_visible: boolean;
  multi_select: boolean;
  can_deselect: boolean;
  updates_instantly: boolean;
  needs_apply_button: boolean;
  changes_result_count: boolean;
  persists_in_url: boolean;
  mobile_friendly: boolean;
  actually_useful: boolean;
  notes: string;
}

export interface FiltersAudit {
  target: TargetId;
  filters: FilterRecord[];
  missing_important_filters: string[];
  notes: string;
}

// ---------------------------------------------------------------------------
// Details pages (§14 systems/articles, §15 judgments)
// ---------------------------------------------------------------------------

export interface DetailsPageRecord {
  target: TargetId;
  url: string;
  page_type: "system_article" | "judgment" | "unknown";
  fields_present: Record<string, boolean>;
  has_copy_button: boolean;
  has_share_button: boolean;
  has_print_button: boolean;
  has_pdf: boolean;
  has_official_source: boolean;
  has_last_update: boolean;
  has_related_articles: boolean;
  has_related_judgments: boolean;
  readable_for_legal_research: boolean;
  content_hidden_by_subscription: boolean;
  notes: string;
}

export interface DetailsAudit {
  target: TargetId;
  pages: DetailsPageRecord[];
  notes: string;
}

// ---------------------------------------------------------------------------
// Performance (§22)
// ---------------------------------------------------------------------------

export interface PerformanceRecord {
  target: TargetId;
  url: string;
  viewport: ViewportName;
  fcp_ms: number | null;
  lcp_ms: number | null;
  tti_ms: number | null;
  tbt_ms: number | null;
  dom_content_loaded_ms: number | null;
  load_event_ms: number | null;
  request_count: number;
  js_bytes: number;
  css_bytes: number;
  image_bytes: number;
  font_bytes: number;
  total_bytes: number;
  has_lazy_loading: boolean;
  console_errors: number;
  network_errors: number;
  notes: string;
}

export interface PerformanceAudit {
  target: TargetId;
  records: PerformanceRecord[];
  notes: string;
}

// ---------------------------------------------------------------------------
// Accessibility (§20)
// ---------------------------------------------------------------------------

export interface AccessibilityRecord {
  target: TargetId;
  url: string;
  images_total: number;
  images_with_alt: number;
  buttons_total: number;
  buttons_with_accessible_name: number;
  inputs_total: number;
  inputs_with_label: number;
  low_contrast_samples: number;
  contrast_samples_checked: number;
  has_lang_attribute: boolean;
  lang_value: string;
  has_visible_focus: boolean;
  keyboard_focusable_count: number;
  issues: string[];
  notes: string;
}

export interface AccessibilityAudit {
  target: TargetId;
  records: AccessibilityRecord[];
  notes: string;
}

// ---------------------------------------------------------------------------
// SEO (§21)
// ---------------------------------------------------------------------------

export interface SeoRecord {
  target: TargetId;
  url: string;
  title: string;
  meta_description: string;
  h1: string[];
  h2_count: number;
  h3_count: number;
  canonical: string | null;
  robots_meta: string | null;
  has_sitemap: boolean;
  has_structured_data: boolean;
  structured_data_types: string[];
  has_open_graph: boolean;
  lang: string;
  dir: string;
  url_is_descriptive: boolean;
  internal_links_count: number;
  issues: string[];
  notes: string;
}

export interface SeoAudit {
  target: TargetId;
  records: SeoRecord[];
  has_sitemap_xml: boolean;
  has_robots_txt: boolean;
  notes: string;
}

// ---------------------------------------------------------------------------
// Legal trust (§24) + knowledge features (§25)
// ---------------------------------------------------------------------------

export interface LegalTrustRecord {
  target: TargetId;
  url: string;
  has_official_source: boolean;
  has_issue_date: boolean;
  has_update_date: boolean;
  has_enforcement_status: boolean;
  has_previous_version: boolean;
  has_amendment_comparison: boolean;
  has_regulation_reference: boolean;
  has_related_article_reference: boolean;
  content_type_labeled: boolean;
  content_types_found: string[];
  source_verifiable: boolean;
  has_incomplete_content_warning: boolean;
  distinguishes_text_from_analysis: boolean;
  notes: string;
}

export interface LegalTrustAudit {
  target: TargetId;
  records: LegalTrustRecord[];
  notes: string;
}

export interface KnowledgeFeaturesAudit {
  target: TargetId;
  related_articles: boolean;
  related_judgments: boolean;
  similar_precedents: boolean;
  related_topics: boolean;
  classification_tree: boolean;
  system_regulation_judgment_links: boolean;
  search_within_system: boolean;
  search_within_judgment: boolean;
  summaries: boolean;
  keywords: boolean;
  smart_suggestions: boolean;
  version_comparison: boolean;
  ai_assistant: boolean;
  ai_cites_sources: boolean | null;
  notes: string;
}

// ---------------------------------------------------------------------------
// Subscription / registration funnel (§23)
// ---------------------------------------------------------------------------

export interface SubscriptionAudit {
  target: TargetId;
  has_login_page: boolean;
  has_register_page: boolean;
  has_forgot_password: boolean;
  has_pricing_page: boolean;
  free_vs_paid_clear: boolean;
  clear_cta: boolean;
  has_trial: boolean;
  has_plans: boolean;
  has_plan_comparison: boolean;
  has_sales_contact: boolean;
  paywall_message_clear: boolean;
  notes: string;
}

// ---------------------------------------------------------------------------
// Scoring (§27)
// ---------------------------------------------------------------------------

export interface ScoreBreakdown {
  [criterion: string]: number;
}

export interface ScoreCard {
  total: number; // out of 100
  breakdown: ScoreBreakdown;
}

export interface TargetScores {
  target: TargetId;
  search: ScoreCard;
  ux: ScoreCard;
  legal_trust: ScoreCard;
  performance: ScoreCard;
}

// ---------------------------------------------------------------------------
// Competitive opportunities (§30)
// ---------------------------------------------------------------------------

export interface CompetitiveOpportunities {
  generated_at: string;
  qanoniah_top_strengths: string[];
  qistas_top_strengths: string[];
  qanoniah_top_weaknesses: string[];
  qistas_top_weaknesses: string[];
  unexploited_opportunities: string[];
  ideal_search_box: string[];
  ideal_results_page: string[];
  ideal_article_page: string[];
  ideal_judgment_page: string[];
  linking_recommendations: string[];
  filters_indexes_recommendations: string[];
  mobile_recommendations: string[];
  trust_source_recommendations: string[];
  information_architecture_recommendations: string[];
  ai_assistant_recommendations: string[];
  adopt: string[];
  avoid: string[];
  win_areas: string[];
}

// ---------------------------------------------------------------------------
// Aggregate, per-target audit bundle
// ---------------------------------------------------------------------------

export interface TargetAuditBundle {
  target: TargetId;
  label: string;
  searchResults: SearchResultRecord[];
  pages: PageAuditRecord[];
  navigation: NavigationMap;
  icons: IconAudit;
  searchBox: SearchBoxAudit;
  indexes: IndexesAudit;
  filters: FiltersAudit;
  details: DetailsAudit;
  performance: PerformanceAudit;
  accessibility: AccessibilityAudit;
  seo: SeoAudit;
  legalTrust: LegalTrustAudit;
  knowledge: KnowledgeFeaturesAudit;
  subscription: SubscriptionAudit;
  scores: TargetScores;
  blocked: boolean;
  notes: string[];
}
