#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Muqtafi Thesaurus / Concept / Lexicon Extractor
===============================================

A robust, structure-aware extractor for the *conceptual* layer of the Muqtafi
legal database (Birzeit University, ``muqtafi.birzeit.edu``):

- the **legal thesaurus** (المكنز القانوني) — descriptors and their relations,
- the **conceptual linking** base (قاعدة الربط المفاهيمي),
- the **legal lexicon / dictionary** (المعجم القانوني) — term definitions.

It parses each entry into a structured record (term, type, definition, scope
note, and thesaurus relations: broader / narrower / related / synonym / used-for)
and can assemble a **legal issue tree** from the broader↔narrower relations.

Scope and ethics
----------------
This tool is **robust**, not **evasive**. It is built to handle the real site
mechanics (ASP.NET postbacks, pagination, sessions, Arabic encoding) for
*authorized* access to *public* content. It deliberately does **not** and must
**not** be extended to:

- bypass login, subscription, or paywalls,
- solve CAPTCHAs, rotate IPs/proxies, or spoof a browser to defeat bot blocking,
- ignore ``robots.txt`` or hammer the server.

Muqtafi may return HTTP 403 to automated clients; that is an access decision by
the operator. Expanded access requires **written permission from Birzeit** or an
official API. This extractor is independent and is **not** wired to any
production database.

Usage
-----
::

    python muqtafi_thesaurus_extractor.py \\
        --seed "https://muqtafi.birzeit.edu/<thesaurus-page>" \\
        --max-pages 5 --delay 3 \\
        --out muqtafi_thesaurus.jsonl --tree muqtafi_issue_tree.json
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import time
from dataclasses import asdict, dataclass, field
from html import unescape
from typing import Optional
from urllib.parse import urljoin, urlparse
from urllib.robotparser import RobotFileParser

import requests
from bs4 import BeautifulSoup, Tag

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

BASE = "https://muqtafi.birzeit.edu/"
ALLOWED_HOST_SUFFIX = "muqtafi.birzeit.edu"
TIMEOUT = 25

DEFAULT_USER_AGENT = (
    "HakeemLegalThesaurusResearchBot/0.1 "
    "(+lawful authorized research; contact data owner before bulk use)"
)

# Private / non-public areas that are never fetched.
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
# Thesaurus relation vocabulary (Arabic labels + ISO-2788 style abbreviations)
# ---------------------------------------------------------------------------

# Each relation maps to the labels that may introduce it on a page. Labels are
# matched case-insensitively against normalized Arabic text.
RELATION_LABELS: dict[str, list[str]] = {
    "broader": ["المصطلح الأعم", "الأعم", "أعم", "BT", "Broader"],
    "narrower": ["المصطلح الأخص", "الأخص", "أخص", "NT", "Narrower"],
    "related": ["مصطلح ذو صلة", "ذو صلة", "ذات صلة", "انظر أيضا", "RT", "Related"],
    "synonyms": ["مرادف", "المرادفات", "مرادفات", "UF", "Used For"],
    "use_for": ["استخدم", "استخدم بدلا من", "استعمل", "USE"],
    "definition": ["تعريف", "التعريف", "المعنى", "يقصد ب", "Definition"],
    "scope_note": ["ملاحظة", "ملاحظة المجال", "مجال الاستخدام", "SN", "Scope Note"],
    "domain": ["المجال", "التصنيف", "الباب", "Domain", "Category"],
}

# Entry-type detection hints.
ENTRY_TYPE_THESAURUS = "thesaurus_descriptor"
ENTRY_TYPE_CONCEPT = "concept"
ENTRY_TYPE_LEXICON = "lexicon_entry"

REVIEW_THRESHOLD = 0.85

AR_TEXT_RE = re.compile(r"[؀-ۿ]")


# ---------------------------------------------------------------------------
# Text helpers
# ---------------------------------------------------------------------------


def clean_text(text: str) -> str:
    text = unescape(text or "")
    return re.sub(r"\s+", " ", text).strip()


def normalize_arabic(text: str) -> str:
    text = unescape(text or "")
    text = re.sub(r"[إأآا]", "ا", text)
    text = re.sub(r"ى", "ي", text)
    text = re.sub(r"ؤ", "و", text)
    text = re.sub(r"ئ", "ي", text)
    text = re.sub(r"ة", "ه", text)
    text = re.sub(r"[ً-ٰٟ]", "", text)
    return re.sub(r"\s+", " ", text).strip()


def clamp_confidence(value: float) -> float:
    return round(max(0.0, min(0.95, value)), 2)


def split_terms(value: str) -> list[str]:
    """Split a relation value (which may list several terms) into clean items."""
    parts = re.split(r"[،,؛;\n\|]+|\s-\s|•", value)
    out = [clean_text(p) for p in parts if clean_text(p)]
    return list(dict.fromkeys(out))


# ---------------------------------------------------------------------------
# Data model
# ---------------------------------------------------------------------------


@dataclass
class ThesaurusEntry:
    source: str
    jurisdiction: str
    term: str
    entry_type: str
    domain: Optional[str]
    definition: Optional[str]
    scope_note: Optional[str]
    broader: list[str]
    narrower: list[str]
    related: list[str]
    synonyms: list[str]
    use_for: list[str]
    source_url: str
    confidence: float
    needs_human_review: bool = True

    def key(self) -> str:
        return normalize_arabic(self.term)


# ---------------------------------------------------------------------------
# URL / robots / fetch (robust, polite)
# ---------------------------------------------------------------------------


def url_allowed(url: str) -> bool:
    parsed = urlparse(url)
    host = parsed.netloc.split(":")[0].lower()
    if not (host == ALLOWED_HOST_SUFFIX or host.endswith("." + ALLOWED_HOST_SUFFIX)):
        return False
    lower = url.lower()
    return not any(part in lower for part in STOP_URL_PARTS)


def build_session(user_agent: str) -> requests.Session:
    session = requests.Session()
    # Honest, descriptive identification + correct content negotiation.
    session.headers.update(
        {
            "User-Agent": user_agent,
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "ar,en;q=0.7",
        }
    )
    return session


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


def _decode(resp: requests.Response) -> str:
    if not resp.encoding or resp.encoding.lower() in {"iso-8859-1", "ascii"}:
        resp.encoding = resp.apparent_encoding or "utf-8"
    return resp.text


def request(
    session: requests.Session,
    url: str,
    *,
    method: str = "GET",
    data: Optional[dict] = None,
    retries: int = 3,
    backoff: float = 2.0,
) -> str:
    """GET or POST with retry+backoff on transient network errors."""
    for attempt in range(retries + 1):
        try:
            if method == "POST":
                resp = session.post(url, data=data, timeout=TIMEOUT)
            else:
                resp = session.get(url, timeout=TIMEOUT)
            resp.raise_for_status()
            return _decode(resp)
        except (requests.ConnectionError, requests.Timeout) as exc:
            if attempt < retries:
                wait = backoff * (2**attempt)
                print(
                    f"  [retry {attempt + 1}/{retries}] {method} {url} "
                    f"({exc.__class__.__name__}); waiting {wait:.0f}s",
                    file=sys.stderr,
                )
                time.sleep(wait)
            else:
                raise
        except requests.HTTPError:
            raise
    raise RuntimeError("unreachable")


# ---------------------------------------------------------------------------
# ASP.NET form / pagination helpers
# ---------------------------------------------------------------------------

ASPNET_FIELDS = (
    "__VIEWSTATE",
    "__VIEWSTATEGENERATOR",
    "__EVENTVALIDATION",
    "__VIEWSTATEENCRYPTED",
)


def read_aspnet_state(soup: BeautifulSoup) -> dict[str, str]:
    """Collect the hidden state fields needed to replay an ASP.NET postback."""
    state: dict[str, str] = {}
    for name in ASPNET_FIELDS:
        el = soup.find("input", attrs={"name": name})
        if isinstance(el, Tag) and el.has_attr("value"):
            state[name] = str(el["value"])
    return state


def aspnet_postback(
    session: requests.Session,
    url: str,
    html: str,
    event_target: str,
    *,
    event_argument: str = "",
    retries: int = 3,
    backoff: float = 2.0,
) -> Optional[str]:
    """Replay a ``__doPostBack(event_target, event_argument)`` navigation.

    Returns the resulting HTML, or ``None`` if the page carries no ASP.NET state
    (i.e. it is not a postback-driven page).
    """
    soup = BeautifulSoup(html, "html.parser")
    state = read_aspnet_state(soup)
    if "__VIEWSTATE" not in state:
        return None
    data = dict(state)
    data["__EVENTTARGET"] = event_target
    data["__EVENTARGUMENT"] = event_argument
    return request(
        session, url, method="POST", data=data, retries=retries, backoff=backoff
    )


def find_next_postback(html: str) -> Optional[str]:
    """Find a 'next page' control that triggers an ASP.NET postback.

    Returns the ``__EVENTTARGET`` to post, or ``None`` if not found.
    """
    soup = BeautifulSoup(html, "html.parser")
    next_labels = ["التالي", "التالية", "الصفحة التالية", "next", ">", "»"]
    for el in soup.find_all(["a", "input", "button"]):
        label = clean_text(el.get_text(" ")) or clean_text(str(el.get("value", "")))
        if not label:
            continue
        if not any(normalize_arabic(n) in normalize_arabic(label) for n in next_labels):
            continue
        href = el.get("href", "") if isinstance(el, Tag) else ""
        m = re.search(r"__doPostBack\(['\"]([^'\"]+)['\"]", str(href))
        if m:
            return m.group(1)
        name = el.get("name") if isinstance(el, Tag) else None
        if name:  # plain submit button participates as its own event target
            return str(name)
    return None


# ---------------------------------------------------------------------------
# Parsing thesaurus / concept / lexicon entries
# ---------------------------------------------------------------------------


def _relation_for_label(label: str) -> Optional[str]:
    norm = normalize_arabic(label).strip(" :：-")
    for rel, labels in RELATION_LABELS.items():
        for cand in labels:
            nc = normalize_arabic(cand)
            if norm == nc or norm.startswith(nc + " ") or norm == nc + ":":
                return rel
    return None


def _blank_relations() -> dict[str, list[str]]:
    return {
        "broader": [],
        "narrower": [],
        "related": [],
        "synonyms": [],
        "use_for": [],
    }


def parse_label_value_pairs(soup: BeautifulSoup) -> list[dict]:
    """Extract entries from common label/value structures.

    Supports definition lists (``dt``/``dd``), two-column tables, and labeled
    ``span``/``div`` blocks. Each detected term becomes one record.
    """
    entries: list[dict] = []

    # 1) Definition lists.
    for dl in soup.find_all("dl"):
        record = _new_record()
        for dt in dl.find_all("dt"):
            label = clean_text(dt.get_text(" "))
            dd = dt.find_next_sibling("dd")
            value = clean_text(dd.get_text(" ")) if dd else ""
            _apply_label(record, label, value)
        if record["term"]:
            entries.append(record)

    # 2) Two-column tables (label | value).
    for table in soup.find_all("table"):
        record = _new_record()
        for tr in table.find_all("tr"):
            cells = tr.find_all(["td", "th"])
            if len(cells) < 2:
                continue
            label = clean_text(cells[0].get_text(" "))
            value = clean_text(cells[1].get_text(" "))
            _apply_label(record, label, value)
        if record["term"]:
            entries.append(record)

    return entries


def parse_labeled_text(text: str) -> Optional[dict]:
    """Fallback: parse a single entry from labeled inline text.

    Handles runs like ``المصطلح: الحجز  الأعم: التنفيذ  الأخص: الحجز التحفظي``.
    """
    record = _new_record()
    # Build an alternation of every known label.
    all_labels = ["المصطلح", "المفهوم", "الكلمة"]
    for labels in RELATION_LABELS.values():
        all_labels.extend(labels)
    pattern = "|".join(
        sorted((re.escape(x) for x in all_labels), key=len, reverse=True)
    )
    matches = list(re.finditer(rf"({pattern})\s*[:：]\s*", text))
    if not matches:
        return None
    for i, m in enumerate(matches):
        label = m.group(1)
        start = m.end()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(text)
        value = clean_text(text[start:end])
        _apply_label(record, label, value)
    return record if record["term"] else None


def _new_record() -> dict:
    rec: dict = {
        "term": "",
        "definition": None,
        "scope_note": None,
        "domain": None,
    }
    rec.update(_blank_relations())
    return rec


def _apply_label(record: dict, label: str, value: str) -> None:
    if not value:
        return
    norm_label = normalize_arabic(label).strip(" :：-")
    if norm_label in {normalize_arabic(x) for x in ("المصطلح", "المفهوم", "الكلمة")}:
        record["term"] = clean_text(value)
        return
    rel = _relation_for_label(label)
    if rel == "definition":
        record["definition"] = clean_text(value)
    elif rel == "scope_note":
        record["scope_note"] = clean_text(value)
    elif rel == "domain":
        record["domain"] = clean_text(value)
    elif rel in ("broader", "narrower", "related", "synonyms", "use_for"):
        record[rel].extend(split_terms(value))


def _record_confidence(record: dict) -> float:
    score = 0.55
    if record["definition"]:
        score += 0.15
    if record["broader"] or record["narrower"]:
        score += 0.15
    if record["domain"]:
        score += 0.05
    if record["related"] or record["synonyms"] or record["use_for"]:
        score += 0.05
    return clamp_confidence(score)


def _detect_entry_type(record: dict) -> str:
    if record["broader"] or record["narrower"] or record["use_for"]:
        return ENTRY_TYPE_THESAURUS
    if record["definition"] and not (record["related"] or record["synonyms"]):
        return ENTRY_TYPE_LEXICON
    return ENTRY_TYPE_CONCEPT


def parse_entries(html: str, url: str) -> list[ThesaurusEntry]:
    soup = BeautifulSoup(html, "html.parser")
    for tag in soup(["script", "style", "noscript"]):
        tag.decompose()

    records = parse_label_value_pairs(soup)
    if not records:
        # Fallback: try to parse a single labeled-text entry from the body.
        body = clean_text(soup.get_text(" "))
        if AR_TEXT_RE.search(body):
            one = parse_labeled_text(body)
            if one:
                records = [one]

    entries: list[ThesaurusEntry] = []
    for rec in records:
        if not rec["term"]:
            continue
        conf = _record_confidence(rec)
        entries.append(
            ThesaurusEntry(
                source="Muqtafi / Birzeit",
                jurisdiction="PS",
                term=rec["term"],
                entry_type=_detect_entry_type(rec),
                domain=rec["domain"],
                definition=rec["definition"],
                scope_note=rec["scope_note"],
                broader=rec["broader"],
                narrower=rec["narrower"],
                related=rec["related"],
                synonyms=rec["synonyms"],
                use_for=rec["use_for"],
                source_url=url,
                confidence=conf,
                needs_human_review=conf < REVIEW_THRESHOLD,
            )
        )
    return entries


# ---------------------------------------------------------------------------
# Issue-tree assembly (from broader / narrower relations)
# ---------------------------------------------------------------------------


def build_issue_tree(entries: list[ThesaurusEntry]) -> list[dict]:
    """Assemble nested trees from broader↔narrower relations.

    Returns a list of root nodes; each node is
    ``{"term", "domain", "children": [...]}``. Cycles are broken defensively.
    """
    by_key = {e.key(): e for e in entries}
    children: dict[str, list[str]] = {k: [] for k in by_key}
    has_parent: set[str] = set()

    def link(parent_key: str, child_key: str) -> None:
        if parent_key in by_key and child_key in by_key:
            if child_key not in children[parent_key]:
                children[parent_key].append(child_key)
            has_parent.add(child_key)

    for e in entries:
        ek = e.key()
        for nt in e.narrower:
            link(ek, normalize_arabic(nt))
        for bt in e.broader:
            link(normalize_arabic(bt), ek)

    def build_node(key: str, seen: frozenset[str]) -> dict:
        entry = by_key[key]
        node: dict = {"term": entry.term, "domain": entry.domain, "children": []}
        for ck in children.get(key, []):
            if ck in seen:  # break cycles
                continue
            node["children"].append(build_node(ck, seen | {ck}))
        return node

    roots = [k for k in by_key if k not in has_parent]
    return [build_node(k, frozenset({k})) for k in roots]


# ---------------------------------------------------------------------------
# Crawl driver
# ---------------------------------------------------------------------------


@dataclass
class RunLog:
    base: str
    max_pages: int
    delay: float
    output: str
    user_agent: str
    robots_checked: bool = False
    robots_available: bool = False
    fetched: list[dict] = field(default_factory=list)
    errors: list[dict] = field(default_factory=list)
    total_entries: int = 0
    total_pages_fetched: int = 0


def extract_entry_links(html: str, base_url: str) -> list[str]:
    """In-scope links that look like individual term/concept pages."""
    soup = BeautifulSoup(html, "html.parser")
    links: list[str] = []
    hints = ["term", "concept", "thes", "moknez", "mu3jam", "lex", "word", "id="]
    for a in soup.find_all("a", href=True):
        href = urljoin(base_url, a["href"])
        if not url_allowed(href):
            continue
        if any(h in href.lower() for h in hints):
            links.append(href)
    return list(dict.fromkeys(links))


def crawl(args: argparse.Namespace) -> tuple[list[ThesaurusEntry], RunLog]:
    session = build_session(args.user_agent)
    run_log = RunLog(
        base=BASE,
        max_pages=args.max_pages,
        delay=args.delay,
        output=args.out,
        user_agent=args.user_agent,
    )

    rp = get_robot_parser(session)
    run_log.robots_checked = True
    run_log.robots_available = rp is not None

    queue = list(dict.fromkeys(args.seed or []))
    if not queue:
        print(
            "No --seed page given. Provide the public thesaurus/concept URL(s).",
            file=sys.stderr,
        )
    visited: set[str] = set()
    entries: list[ThesaurusEntry] = []

    while queue and len(visited) < args.max_pages:
        url = queue.pop(0)
        if url in visited or not url_allowed(url):
            continue
        if rp is not None and not rp.can_fetch(args.user_agent, url):
            run_log.errors.append({"url": url, "error": "Disallowed by robots.txt"})
            continue
        try:
            html = request(session, url, retries=args.retries, backoff=args.backoff)
            visited.add(url)
            page_entries = parse_entries(html, url)
            entries.extend(page_entries)
            run_log.fetched.append({"url": url, "entry_count": len(page_entries)})

            for link in extract_entry_links(html, url):
                if link not in visited and link not in queue:
                    queue.append(link)

            # Follow polite ASP.NET pagination if present.
            if args.follow_pagination and len(visited) < args.max_pages:
                target = find_next_postback(html)
                if target:
                    time.sleep(args.delay)
                    next_html = aspnet_postback(
                        session,
                        url,
                        html,
                        target,
                        retries=args.retries,
                        backoff=args.backoff,
                    )
                    if next_html:
                        page_url = f"{url}#page{len(visited)}"
                        if page_url not in visited:
                            visited.add(page_url)
                            more = parse_entries(next_html, url)
                            entries.extend(more)
                            run_log.fetched.append(
                                {"url": page_url, "entry_count": len(more)}
                            )

            time.sleep(args.delay)
        except Exception as exc:  # noqa: BLE001 - record and continue politely
            run_log.errors.append({"url": url, "error": repr(exc)})

    # De-duplicate entries by normalized term, merging relations.
    entries = _merge_entries(entries)
    run_log.total_entries = len(entries)
    run_log.total_pages_fetched = len(visited)
    return entries, run_log


def _merge_entries(entries: list[ThesaurusEntry]) -> list[ThesaurusEntry]:
    merged: dict[str, ThesaurusEntry] = {}
    for e in entries:
        k = e.key()
        if k not in merged:
            merged[k] = e
            continue
        cur = merged[k]
        for fld in ("broader", "narrower", "related", "synonyms", "use_for"):
            combined = getattr(cur, fld) + [
                x for x in getattr(e, fld) if x not in getattr(cur, fld)
            ]
            setattr(cur, fld, combined)
        cur.definition = cur.definition or e.definition
        cur.scope_note = cur.scope_note or e.scope_note
        cur.domain = cur.domain or e.domain
        cur.confidence = max(cur.confidence, e.confidence)
        cur.needs_human_review = cur.confidence < REVIEW_THRESHOLD
    return list(merged.values())


def write_outputs(
    entries: list[ThesaurusEntry],
    run_log: RunLog,
    args: argparse.Namespace,
) -> None:
    with open(args.out, "w", encoding="utf-8") as f:
        for e in entries:
            f.write(json.dumps(asdict(e), ensure_ascii=False) + "\n")
    if args.tree:
        tree = build_issue_tree(entries)
        with open(args.tree, "w", encoding="utf-8") as f:
            json.dump(tree, f, ensure_ascii=False, indent=2)
    with open(args.log, "w", encoding="utf-8") as f:
        json.dump(asdict(run_log), f, ensure_ascii=False, indent=2)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Extract the Muqtafi thesaurus / concepts / lexicon (authorized, public)."
    )
    parser.add_argument(
        "--seed",
        action="append",
        default=[],
        help="Public thesaurus/concept URL (repeatable).",
    )
    parser.add_argument("--max-pages", type=int, default=5)
    parser.add_argument("--delay", type=float, default=3.0)
    parser.add_argument("--retries", type=int, default=3)
    parser.add_argument("--backoff", type=float, default=2.0)
    parser.add_argument("--user-agent", default=DEFAULT_USER_AGENT)
    parser.add_argument(
        "--follow-pagination",
        action="store_true",
        help="Follow polite ASP.NET 'next page' postbacks within --max-pages.",
    )
    parser.add_argument("--out", default="muqtafi_thesaurus.jsonl")
    parser.add_argument(
        "--tree", default="", help="Optional path for the nested issue-tree JSON."
    )
    parser.add_argument("--log", default="muqtafi_thesaurus_run_log.json")
    return parser


def main(argv: Optional[list[str]] = None) -> int:
    args = build_parser().parse_args(argv)
    if args.max_pages <= 0:
        print("--max-pages must be positive", file=sys.stderr)
        return 2
    if args.delay < 0:
        print("--delay must be non-negative", file=sys.stderr)
        return 2

    entries, run_log = crawl(args)
    write_outputs(entries, run_log, args)
    print(json.dumps(asdict(run_log), ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
