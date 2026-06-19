#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Muqtafi Legal Issue Tree Extractor
==================================

A safe, deliberately small crawler that extracts *legal issue-tree candidates*
from **public** pages of the Muqtafi legal database (Birzeit University,
``muqtafi.birzeit.edu``).

The tool only reads structure and public text. It is meant for lawful,
research-oriented sampling that feeds a human-reviewed mapping step into the
"Hakeem Legal Issues Core". It is intentionally *not* wired to any production
database.

Design goals
------------
- Respect ``robots.txt`` where reachable.
- Never crawl aggressively: a configurable polite delay, a hard page cap, and a
  single-threaded queue.
- Skip login / subscription / account / non-public URLs entirely.
- Retry transient network failures (timeouts, DNS, connection resets) with
  exponential backoff.
- Extract structure only: domains, law names, chapters, article numbers, and
  legal-issue candidates (concept / legal issue / procedure / article heading /
  law title / alias), each with a confidence score and a ``needs_human_review``
  flag.
- Emit clean JSONL suitable for a later, human-reviewed mapping step.

Usage
-----
::

    python muqtafi_issue_tree_extractor.py \\
        --max-pages 5 --delay 3 \\
        --out muqtafi_issue_candidates.jsonl

See ``README.md`` in this directory for the full output schema and the
legal/ethical usage notes.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import time
from collections import Counter
from dataclasses import asdict, dataclass, field
from html import unescape
from typing import Optional
from urllib.parse import urljoin, urlparse
from urllib.robotparser import RobotFileParser

import requests
from bs4 import BeautifulSoup

# ---------------------------------------------------------------------------
# Constants / configuration
# ---------------------------------------------------------------------------

BASE = "https://muqtafi.birzeit.edu/"
ALLOWED_HOST_SUFFIX = "muqtafi.birzeit.edu"

DEFAULT_SEEDS = [
    "https://muqtafi.birzeit.edu/",
    "https://muqtafi.birzeit.edu/sitemap.aspx",
    "https://muqtafi.birzeit.edu/userGuide.aspx",
    "https://muqtafi.birzeit.edu/Welcome_legislation.aspx",
    "https://muqtafi.birzeit.edu/Welcome_courtjudgements.aspx",
    # Known public legislation examples; keep the sample list small on purpose.
    "https://muqtafi.birzeit.edu/pg/getleg.asp?id=15138",  # Enforcement Law 2005
    "https://muqtafi.birzeit.edu/pg/getleg.asp?id=18928",  # 2024 amendment
]

USER_AGENT = (
    "HakeemLegalIssueTreeResearchBot/0.2 "
    "(+lawful small-sample research; contact owner before any bulk use)"
)
TIMEOUT = 20

# URL substrings that mark private / non-public / account areas. Matched
# case-insensitively. Anything containing one of these is never fetched.
STOP_URL_PARTS = [
    "login",
    "logout",
    "signin",
    "signup",
    "forgotpassword",
    "resetpassword",
    "password",
    "register",
    "subscribe",
    "subscriber",
    "subscription",
    "account",
    "myaccount",
    "unrole",
    "returnurl",
    "cart",
    "checkout",
    "payment",
    "admin",
]

# ---------------------------------------------------------------------------
# Arabic / legal patterns
# ---------------------------------------------------------------------------

ARTICLE_RE = re.compile(r"(?:مادة|المادة)\s*\(?\s*([0-9٠-٩]+)\s*\)?")
CHAPTER_RE = re.compile(r"^(?:الباب|الفصل|الفرع|القسم|الكتاب)\s+(.{2,120})$")
# Same idea, but for finding a chapter heading inside a collapsed text run.
CHAPTER_INLINE_RE = re.compile(r"(?:الباب|الفصل|الفرع|القسم|الكتاب)\s+[^\.؛،]{2,120}")
AR_TEXT_RE = re.compile(r"[؀-ۿ]")
LAW_TITLE_RE = [
    re.compile(r"((?:قانون|قرار بقانون|نظام|لائحة|مرسوم)\s+[^\n\r\.،]{4,160})"),
    re.compile(r"(مجلة الأحكام العدلية)"),
]

LEGAL_NAV_HINTS = [
    "قاعدة التشريعات",
    "قاعدة الأحكام",
    "قاعدة الربط المفاهيمي",
    "المعجم القانوني",
    "المكنز القانوني",
    "Conceptual Linking",
    "Legal Lexicon",
    "Legal Thesaurus",
    "Judicial",
    "Legislation",
]

# Procedural / enforcement issue keywords.
PROCEDURAL_ISSUES = [
    "الاختصاص",
    "الدعوى",
    "قيد الدعوى",
    "التبليغ",
    "الدفوع",
    "الطلبات العارضة",
    "الإثبات",
    "الشهادة",
    "الإقرار",
    "اليمين",
    "الخبرة",
    "الأحكام",
    "الاستئناف",
    "النقض",
    "التنفيذ",
    "الحجز",
    "بيع الأموال المحجوزة",
    "حبس المدين",
    "إلغاء الحجز",
    "فك الحجز",
    "الأمور المستعجلة",
    "الطعن",
    "البطلان",
]

# Substantive issue keywords.
SUBSTANTIVE_ISSUES = [
    "العقد",
    "الفسخ",
    "التعويض",
    "الضرر",
    "المسؤولية",
    "الرهن",
    "الملكية",
    "الحيازة",
    "الشركة",
    "الإفلاس",
    "العمل",
    "الأحوال الشخصية",
    "الزواج",
    "الطلاق",
    "النفقة",
    "الميراث",
]

ISSUE_PATTERNS = PROCEDURAL_ISSUES + SUBSTANTIVE_ISSUES

# Candidate type labels.
TYPE_CONCEPT = "concept"
TYPE_LEGAL_ISSUE = "legal_issue"
TYPE_PROCEDURE = "procedure"
TYPE_ARTICLE_HEADING = "article_heading"
TYPE_LAW_TITLE = "law_title"
TYPE_ALIAS = "alias"

# A candidate is flagged for human review whenever confidence is below this.
# Legal data is high-stakes, so the bar is intentionally high.
REVIEW_THRESHOLD = 0.85


# ---------------------------------------------------------------------------
# Data model
# ---------------------------------------------------------------------------


@dataclass
class Evidence:
    url: str
    text_snippet: str
    article_number: Optional[str] = None


@dataclass
class IssueCandidate:
    source: str
    jurisdiction: str
    domain: Optional[str]
    law_name: Optional[str]
    chapter: Optional[str]
    issue_candidate: str
    candidate_type: str
    issue_level: int
    aliases: list[str]
    evidence: Evidence
    confidence: float
    needs_human_review: bool = True

    def dedupe_key(self) -> str:
        return "|".join(
            [
                self.evidence.url,
                self.candidate_type,
                self.evidence.article_number or "",
                normalize_arabic(self.issue_candidate),
            ]
        )


# ---------------------------------------------------------------------------
# Text helpers
# ---------------------------------------------------------------------------


def clean_text(text: str) -> str:
    text = unescape(text or "")
    text = re.sub(r"\s+", " ", text).strip()
    return text


def normalize_arabic(text: str) -> str:
    """Normalize Arabic for matching: unify alef/ya/hamza forms, strip diacritics."""
    text = unescape(text or "")
    text = re.sub(r"[إأآا]", "ا", text)
    text = re.sub(r"ى", "ي", text)
    text = re.sub(r"ؤ", "و", text)
    text = re.sub(r"ئ", "ي", text)
    text = re.sub(r"ة", "ه", text)
    text = re.sub(r"[ً-ٰٟ]", "", text)  # harakat / tatweel marks
    text = re.sub(r"\s+", " ", text).strip()
    return text


def clamp_confidence(value: float) -> float:
    return round(max(0.0, min(0.95, value)), 2)


# ---------------------------------------------------------------------------
# URL / robots / fetch
# ---------------------------------------------------------------------------


def url_allowed(url: str) -> bool:
    """Allow only public pages on the Muqtafi host."""
    parsed = urlparse(url)
    host = parsed.netloc.split(":")[0].lower()
    if not (host == ALLOWED_HOST_SUFFIX or host.endswith("." + ALLOWED_HOST_SUFFIX)):
        return False
    lower = url.lower()
    return not any(part in lower for part in STOP_URL_PARTS)


def get_robot_parser(session: requests.Session) -> Optional[RobotFileParser]:
    robots_url = urljoin(BASE, "robots.txt")
    rp = RobotFileParser()
    rp.set_url(robots_url)
    try:
        resp = session.get(robots_url, timeout=TIMEOUT)
        if resp.status_code >= 400:
            return None
        rp.parse(resp.text.splitlines())
        return rp
    except requests.RequestException:
        return None


def fetch(
    session: requests.Session,
    url: str,
    retries: int = 3,
    backoff: float = 2.0,
) -> Optional[str]:
    """Fetch a URL, retrying transient network errors with exponential backoff.

    Returns the decoded HTML, or raises the last exception after exhausting
    retries. HTTP 4xx/5xx are surfaced immediately (not retried as transient).
    """
    last_exc: Optional[Exception] = None
    for attempt in range(retries + 1):
        try:
            resp = session.get(url, timeout=TIMEOUT)
            resp.raise_for_status()
            # Muqtafi pages are Arabic; force a sane fallback if mis-detected.
            if not resp.encoding or resp.encoding.lower() in {"iso-8859-1", "ascii"}:
                resp.encoding = resp.apparent_encoding or "utf-8"
            return resp.text
        except (requests.ConnectionError, requests.Timeout) as exc:
            # Transient: DNS failure, connection reset, read timeout, etc.
            last_exc = exc
            if attempt < retries:
                wait = backoff * (2**attempt)
                print(
                    f"  [retry {attempt + 1}/{retries}] {url} failed "
                    f"({exc.__class__.__name__}); waiting {wait:.0f}s",
                    file=sys.stderr,
                )
                time.sleep(wait)
            else:
                raise
        except requests.HTTPError:
            raise
    if last_exc is not None:  # pragma: no cover - defensive
        raise last_exc
    return None


# ---------------------------------------------------------------------------
# Link discovery
# ---------------------------------------------------------------------------


def extract_links(html: str, base_url: str) -> list[str]:
    """Return a small, targeted set of in-scope links to follow."""
    soup = BeautifulSoup(html, "html.parser")
    links: list[str] = []
    for a in soup.find_all("a", href=True):
        text = clean_text(a.get_text(" "))
        href = urljoin(base_url, a["href"])
        if not url_allowed(href):
            continue
        # Only navigation to legal modules or public legislation pages.
        if (
            any(h in text for h in LEGAL_NAV_HINTS)
            or "/pg/getleg.asp" in href
            or "Welcome" in href
            or "sitemap" in href
        ):
            links.append(href)
    return list(dict.fromkeys(links))  # preserve order, dedupe


# ---------------------------------------------------------------------------
# Inference helpers
# ---------------------------------------------------------------------------


def infer_domain(text: str, title: str = "") -> Optional[str]:
    blob = normalize_arabic(title + " " + text)
    if any(x in blob for x in ["تنفيذ", "حجز", "المحجوزه", "المنفذ ضده"]):
        return "التنفيذ"
    if any(
        x in blob
        for x in [
            "اصول المحاكمات",
            "المرافعات",
            "الدعوي",
            "التبليغ",
            "الاختصاص",
            "الطعن",
        ]
    ):
        return "المرافعات والإجراءات"
    if any(x in blob for x in ["البينات", "الاثبات", "الشهاده", "الاقرار", "اليمين"]):
        return "الإثبات"
    if any(x in blob for x in ["العقوبات", "الجزاءيه", "جريمه", "الجرائم"]):
        return "الجزائي"
    if any(x in blob for x in ["الشركات", "التجاره", "الافلاس"]):
        return "التجاري"
    if any(x in blob for x in ["الاحوال الشخصيه", "الزواج", "الطلاق", "النفقه"]):
        return "الأحوال الشخصية"
    return None


def infer_law_name(title: str, body: str) -> Optional[str]:
    candidates: list[str] = []
    haystack = title + "\n" + body[:1500]
    for pat in LAW_TITLE_RE:
        for m in pat.finditer(haystack):
            s = clean_text(m.group(1))
            # Drop a trailing page-title / site-name suffix (e.g. "... - المقتفي").
            s = re.split(r"\s+[-|–—]\s+|\s+::\s+", s)[0].strip()
            if len(s) > 4:
                candidates.append(s)
    return candidates[0] if candidates else None


ALIASES_MAP = {
    "الحجز": ["الحجز التنفيذي", "إيقاع الحجز", "الحجز على أموال المدين"],
    "فك الحجز": ["رفع الحجز", "إلغاء الحجز", "تحرير المال المحجوز"],
    "حبس المدين": ["الأمر بالقبض", "القبض على المنفذ ضده", "إكراه المدين"],
    "التبليغ": ["الإعلان", "إشعار الخصم", "ورقة التبليغ"],
    "الطعن": ["الاعتراض", "الاستئناف", "النقض"],
    "البطلان": ["بطلان الحكم", "بطلان الإجراءات", "انعدام الأثر"],
    "الاختصاص": ["الاختصاص النوعي", "الاختصاص المكاني", "ولاية المحكمة"],
}


def candidate_aliases(issue: str) -> list[str]:
    out: list[str] = []
    norm_issue = normalize_arabic(issue)
    for key, vals in ALIASES_MAP.items():
        if normalize_arabic(key) in norm_issue:
            out.extend(vals)
    return list(dict.fromkeys(out))


def classify_issue_keyword(key: str) -> str:
    """Map an issue keyword to a candidate type."""
    if key in PROCEDURAL_ISSUES:
        return TYPE_PROCEDURE
    return TYPE_LEGAL_ISSUE


# ---------------------------------------------------------------------------
# Confidence scoring
# ---------------------------------------------------------------------------


def score_candidate(
    base: float,
    *,
    has_law: bool = False,
    has_domain: bool = False,
    in_heading: bool = False,
    frequency: int = 0,
) -> float:
    """Combine simple, explainable signals into a confidence score."""
    score = base
    if has_law:
        score += 0.10
    if has_domain:
        score += 0.05
    if in_heading:
        score += 0.05
    if frequency >= 3:
        score += 0.08
    elif frequency == 2:
        score += 0.04
    return clamp_confidence(score)


# ---------------------------------------------------------------------------
# Extraction
# ---------------------------------------------------------------------------


def _iter_menu_breadcrumb_labels(soup: BeautifulSoup) -> list[str]:
    """Collect candidate labels from menus, navigation, and breadcrumbs."""
    labels: list[str] = []
    selectors = [
        "nav a",
        "[role=navigation] a",
        "[class*=menu] a",
        "[class*=nav] a",
        "[class*=breadcrumb] a",
        "[class*=breadcrumb] li",
        "[aria-label*=bread] a",
    ]
    for sel in selectors:
        for el in soup.select(sel):
            label = clean_text(el.get_text(" "))
            if label:
                labels.append(label)
    return labels


def extract_issue_candidates(html: str, url: str) -> list[IssueCandidate]:
    soup = BeautifulSoup(html, "html.parser")
    for tag in soup(["script", "style", "noscript"]):
        tag.decompose()

    page_title = clean_text(soup.title.get_text(" ") if soup.title else "")
    body_text = clean_text(soup.get_text(" "))
    if not AR_TEXT_RE.search(body_text):
        return []

    law_name = infer_law_name(page_title, body_text)
    domain = infer_domain(body_text[:3000], page_title)
    has_law = law_name is not None
    has_domain = domain is not None

    # Frequency of each normalized issue keyword across the page body.
    norm_body = normalize_arabic(body_text)
    freq: Counter[str] = Counter()
    for key in ISSUE_PATTERNS:
        norm_key = normalize_arabic(key)
        count = norm_body.count(norm_key)
        if count:
            freq[key] = count

    results: list[IssueCandidate] = []

    # --- 0. Law title (page level) -------------------------------------
    if law_name:
        results.append(
            IssueCandidate(
                source="Muqtafi / Birzeit",
                jurisdiction="PS",
                domain=domain,
                law_name=law_name,
                chapter=None,
                issue_candidate=law_name,
                candidate_type=TYPE_LAW_TITLE,
                issue_level=0,
                aliases=[],
                evidence=Evidence(url=url, text_snippet=law_name),
                confidence=score_candidate(0.80, has_domain=has_domain),
                needs_human_review=True,
            )
        )

    # --- 1. Module / navigation / breadcrumb concepts ------------------
    nav_labels = _iter_menu_breadcrumb_labels(soup)
    for a in soup.find_all("a"):
        label = clean_text(a.get_text(" "))
        if label and label not in nav_labels:
            nav_labels.append(label)
    seen_nav: set[str] = set()
    for label in nav_labels:
        if not any(h in label for h in LEGAL_NAV_HINTS):
            continue
        norm = normalize_arabic(label)
        if norm in seen_nav:
            continue
        seen_nav.add(norm)
        results.append(
            IssueCandidate(
                source="Muqtafi / Birzeit",
                jurisdiction="PS",
                domain=domain or "تصنيف/مصدر قانوني",
                law_name=law_name,
                chapter=None,
                issue_candidate=label,
                candidate_type=TYPE_CONCEPT,
                issue_level=1,
                aliases=candidate_aliases(label),
                evidence=Evidence(url=url, text_snippet=label),
                confidence=score_candidate(0.70, has_law=has_law, in_heading=True),
                needs_human_review=True,
            )
        )

    # --- 2. Chapter / section headings (as standalone concepts) --------
    for heading in soup.find_all(["h1", "h2", "h3", "h4", "strong", "b"]):
        h = clean_text(heading.get_text(" "))
        if CHAPTER_RE.match(h):
            results.append(
                IssueCandidate(
                    source="Muqtafi / Birzeit",
                    jurisdiction="PS",
                    domain=domain,
                    law_name=law_name,
                    chapter=h,
                    issue_candidate=h,
                    candidate_type=TYPE_CONCEPT,
                    issue_level=2,
                    aliases=[],
                    evidence=Evidence(url=url, text_snippet=h),
                    confidence=score_candidate(
                        0.76, has_law=has_law, has_domain=has_domain, in_heading=True
                    ),
                    needs_human_review=True,
                )
            )

    # --- 3. Article headings + issue keywords in article windows -------
    text_chunks = [
        clean_text(x)
        for x in re.split(r"(?=(?:مادة|المادة)\s*\(?\s*[0-9٠-٩]+\s*\)?)", body_text)
        if clean_text(x)
    ]
    # Track the nearest preceding chapter in document order. A chapter heading
    # appearing in one chunk (always after that chunk's article, or in the
    # preamble chunk) governs the *next* article(s), so carry it forward.
    current_chapter: Optional[str] = None
    pending_chapter: Optional[str] = None
    for chunk in text_chunks[:300]:
        if pending_chapter is not None:
            current_chapter = pending_chapter
            pending_chapter = None
        chap_match = CHAPTER_INLINE_RE.search(chunk)
        if chap_match:
            pending_chapter = clean_text(chap_match.group(0))

        art = ARTICLE_RE.search(chunk)
        if not art:
            continue
        article_no = art.group(1)
        # Keep the window within this article: cut before any trailing chapter
        # heading that belongs to the following section.
        body_end = (
            chap_match.start() if chap_match and chap_match.start() > 0 else len(chunk)
        )
        window = chunk[:body_end][:900]
        norm_window = normalize_arabic(window)

        # 3a. The article heading itself as a structural candidate.
        heading_snippet = clean_text(window[:160])
        results.append(
            IssueCandidate(
                source="Muqtafi / Birzeit",
                jurisdiction="PS",
                domain=domain,
                law_name=law_name,
                chapter=current_chapter,
                issue_candidate=f"مادة ({article_no})",
                candidate_type=TYPE_ARTICLE_HEADING,
                issue_level=3,
                aliases=[],
                evidence=Evidence(
                    url=url,
                    text_snippet=heading_snippet,
                    article_number=article_no,
                ),
                confidence=score_candidate(
                    0.60, has_law=has_law, has_domain=has_domain
                ),
                needs_human_review=True,
            )
        )

        # 3b. Issue keywords found within the article window.
        for key in ISSUE_PATTERNS:
            if normalize_arabic(key) not in norm_window:
                continue
            sentences = re.split(r"[\.؛،]\s*", window)
            best = next(
                (s for s in sentences if normalize_arabic(key) in normalize_arabic(s)),
                window[:240],
            )
            best = clean_text(best)
            if len(best) > 260:
                best = best[:260].rsplit(" ", 1)[0] + "…"
            issue_title = key if len(best) > 80 else best
            results.append(
                IssueCandidate(
                    source="Muqtafi / Birzeit",
                    jurisdiction="PS",
                    domain=domain,
                    law_name=law_name,
                    chapter=current_chapter,
                    issue_candidate=issue_title,
                    candidate_type=classify_issue_keyword(key),
                    issue_level=4,
                    aliases=candidate_aliases(issue_title),
                    evidence=Evidence(
                        url=url, text_snippet=best, article_number=article_no
                    ),
                    confidence=score_candidate(
                        0.55,
                        has_law=has_law,
                        has_domain=has_domain,
                        frequency=freq.get(key, 0),
                    ),
                    needs_human_review=True,
                )
            )

    # --- Finalize: review flag + dedupe --------------------------------
    for item in results:
        item.needs_human_review = item.confidence < REVIEW_THRESHOLD

    seen: set[str] = set()
    deduped: list[IssueCandidate] = []
    for item in results:
        key = item.dedupe_key()
        if key not in seen:
            seen.add(key)
            deduped.append(item)
    return deduped


# ---------------------------------------------------------------------------
# Crawl driver
# ---------------------------------------------------------------------------


@dataclass
class RunLog:
    base: str
    max_pages: int
    delay: float
    output: str
    robots_checked: bool = False
    robots_available: bool = False
    fetched: list[dict] = field(default_factory=list)
    errors: list[dict] = field(default_factory=list)
    total_candidates: int = 0
    total_pages_fetched: int = 0


def crawl(args: argparse.Namespace) -> tuple[list[IssueCandidate], RunLog]:
    session = requests.Session()
    session.headers.update({"User-Agent": USER_AGENT})

    run_log = RunLog(
        base=BASE, max_pages=args.max_pages, delay=args.delay, output=args.out
    )

    rp = get_robot_parser(session)
    run_log.robots_checked = True
    run_log.robots_available = rp is not None

    queue = list(dict.fromkeys((args.seed or []) + DEFAULT_SEEDS))
    visited: set[str] = set()
    all_candidates: list[IssueCandidate] = []

    while queue and len(visited) < args.max_pages:
        url = queue.pop(0)
        if url in visited or not url_allowed(url):
            continue
        if rp is not None and not rp.can_fetch(USER_AGENT, url):
            run_log.errors.append({"url": url, "error": "Disallowed by robots.txt"})
            continue
        try:
            html = fetch(session, url, retries=args.retries, backoff=args.backoff)
            visited.add(url)
            if html is None:
                continue
            cand = extract_issue_candidates(html, url)
            all_candidates.extend(cand)
            run_log.fetched.append({"url": url, "candidate_count": len(cand)})
            # Expand only from navigation pages, not legislation pages.
            if "/pg/getleg.asp" not in url:
                for link in extract_links(html, url):
                    if link not in visited and link not in queue:
                        queue.append(link)
            time.sleep(args.delay)
        except Exception as exc:  # noqa: BLE001 - record and continue politely
            run_log.errors.append({"url": url, "error": repr(exc)})

    run_log.total_candidates = len(all_candidates)
    run_log.total_pages_fetched = len(visited)
    return all_candidates, run_log


def write_outputs(
    candidates: list[IssueCandidate], run_log: RunLog, out_path: str, log_path: str
) -> None:
    with open(out_path, "w", encoding="utf-8") as f:
        for item in candidates:
            f.write(json.dumps(asdict(item), ensure_ascii=False) + "\n")
    with open(log_path, "w", encoding="utf-8") as f:
        json.dump(asdict(run_log), f, ensure_ascii=False, indent=2)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Extract legal issue-tree candidates from public Muqtafi pages."
    )
    parser.add_argument("--max-pages", type=int, default=5)
    parser.add_argument("--delay", type=float, default=3.0)
    parser.add_argument("--retries", type=int, default=3)
    parser.add_argument("--backoff", type=float, default=2.0)
    parser.add_argument("--out", default="muqtafi_issue_candidates.jsonl")
    parser.add_argument("--log", default="muqtafi_run_log.json")
    parser.add_argument("--seed", action="append", default=[])
    return parser


def main(argv: Optional[list[str]] = None) -> int:
    args = build_parser().parse_args(argv)
    if args.max_pages <= 0:
        print("--max-pages must be positive", file=sys.stderr)
        return 2
    if args.delay < 0:
        print("--delay must be non-negative", file=sys.stderr)
        return 2

    candidates, run_log = crawl(args)
    write_outputs(candidates, run_log, args.out, args.log)
    print(json.dumps(asdict(run_log), ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
