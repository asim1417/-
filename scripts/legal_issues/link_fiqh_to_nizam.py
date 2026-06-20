#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Linker — ربط شجرة المسائل الفقهية بمواد الأنظمة السعودية الحقيقية.

يأخذ:
  * شجرة المسائل الفقهية (fiqh_issue_candidates.jsonl) المُولّدة سابقًا.
  * تصدير الأنظمة من قاعدة حكيم (saudi_systems.json) بالسكيمة الموثّقة في
    config/legal_issues/saudi_systems.schema.json.

ويُنتج نسخة من المسائل بعد إضافة `linked_articles` (قائمة بمعرّفات المواد
الحقيقية article_id + أرقامها + درجة المطابقة) و`link_status`.

المطابقة: (1) تطابق اسم النظام، ثم (2) تداخل كلمات الباب/الكتاب الفقهي مع
chapter/title/keywords للمادة. هذا ربط آلي مبدئي؛ تبقى needs_human_review = true.

بلا تبعيات خارجية (يعيد استخدام normalize_arabic من مستخرج الموسوعة المصرية).
"""

from __future__ import annotations

import argparse
import json
import sys
from collections import Counter, OrderedDict
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

sys.path.insert(0, str(Path(__file__).resolve().parent))
from egypt_moj_issue_tree_extractor import normalize_arabic  # noqa: E402

# كلمات شائعة لا تفيد في المطابقة (تُطبَّع لاحقًا لتطابق النص المطبّع)
_STOPWORDS_RAW = {
    "في", "من", "على", "الى", "عن", "او", "و", "مع", "النظام", "نظام", "الباب",
    "الفصل", "العقود", "المسماه", "عقد", "احكام", "اول", "الاول", "الثاني",
    "الثالث", "الرابع", "الخامس", "السادس", "السابع", "بين", "الزوجين", "اثار",
    "العامه", "التعريف", "والمفهوم", "الحكم", "والمشروعيه", "الاركان", "الشروط",
    "المعتبره", "الانواع", "والاقسام", "الصور", "والتطبيقات", "الموانع", "وما",
    "يبطله", "ويفسده", "والاحكام", "المترتبه", "والمسؤوليه", "الخيار", "والفسخ",
    "والانفساخ", "النزاع", "وطرق", "الاثبات", "التكييف", "النظامي", "السعودي",
    "والنوازل", "المعاصره", "الخلاف", "الفقهي", "المذاهب", "الاربعه", "الواردهعلى",
    "الناقله", "للملكيه", "العمل", "الوارده", "المشاركات", "التبعيه", "العينيه",
    "الاصليه", "الحقوق", "التامينات", "الالتزام", "مصادر", "انتقال", "انقضاء",
    "الفعل", "اثار", "العقد", "الخاص", "باب", "والولايه", "الوصايه",
    "اركان", "شروط", "انواع", "صور", "موانع", "ضمان", "خيار", "نزاع",
}

# تُطبَّع قائمة التوقّف لتطابق الكلمات بعد التطبيع (مثل «على» ← «علي»)
_STOPWORDS = {normalize_arabic(w) for w in _STOPWORDS_RAW}


def tokens(text: str) -> set:
    """مجموعة كلمات مطبّعة مفيدة (بلا كلمات شائعة وبلا رموز قصيرة)."""
    norm = normalize_arabic(text)
    out = set()
    for tok in norm.split():
        tok = tok.strip()
        if len(tok) < 2 or tok in _STOPWORDS:
            continue
        out.add(tok)
    return out


def nizam_matches(issue_nizam: str, article_nizam: str) -> bool:
    """تطابق اسم النظام (يسمح بالأسماء المركّبة مثل «الشركات / المعاملات»)."""
    a = normalize_arabic(issue_nizam)
    b = normalize_arabic(article_nizam)
    if not a or not b:
        return False
    if b in a or a in b:
        return True
    # تطابق على كلمة مفتاحية مميِّزة للنظام
    keys = ["المعاملات", "الاحوال", "الاثبات", "المرافعات", "الشركات",
            "الافلاس", "التحكيم", "العمل", "الجزائيه", "التجاري"]
    at = set(a.split())
    bt = set(b.split())
    return any(k in at and k in bt for k in keys)


def index_articles(systems_data: Dict[str, Any]) -> List[Dict[str, Any]]:
    """تجهيز المواد مع مجموعات كلماتها للمطابقة السريعة."""
    arts = []
    for art in systems_data.get("articles", []):
        kw = art.get("keywords") or []
        tok = tokens(art.get("chapter", "")) | tokens(art.get("title", ""))
        for k in kw:
            tok |= tokens(k)
        arts.append({
            "id": art.get("id"),
            "nizam": art.get("nizam", ""),
            "system_id": art.get("system_id"),
            "chapter": art.get("chapter", ""),
            "number": art.get("number"),
            "title": art.get("title", ""),
            "_tokens": tok,
        })
    return arts


def match_issue(issue: Dict[str, Any], articles: List[Dict[str, Any]],
                threshold: int, top_k: int) -> List[Dict[str, Any]]:
    """يُرجِع أفضل المواد المطابِقة لمسألة فقهية."""
    query = tokens(issue.get("book", "")) | tokens(
        issue.get("suggested_saudi_nizam_chapter", ""))
    # عنوان المسألة قد يضيف إشارة (مثل اسم الباب الفقهي)
    query |= tokens(issue.get("parent_title", ""))
    issue_nizam = issue.get("suggested_saudi_nizam", "")

    scored: List[Tuple[int, Dict[str, Any]]] = []
    for art in articles:
        if not nizam_matches(issue_nizam, art["nizam"]):
            continue
        score = len(query & art["_tokens"])
        if score >= threshold:
            scored.append((score, art))
    scored.sort(key=lambda x: x[0], reverse=True)

    results = []
    for score, art in scored[:top_k]:
        results.append(OrderedDict([
            ("article_id", art["id"]),
            ("number", art["number"]),
            ("nizam", art["nizam"]),
            ("chapter", art["chapter"]),
            ("score", score),
        ]))
    return results


def link(issues: List[Dict[str, Any]], systems_data: Dict[str, Any],
         threshold: int = 1, top_k: int = 3,
         link_levels=(2, 4)) -> List[Dict[str, Any]]:
    """يربط المسائل بالمواد ويضيف linked_articles + link_status."""
    articles = index_articles(systems_data)
    out = []
    for issue in issues:
        rec = OrderedDict(issue)
        if issue.get("level") in link_levels:
            matches = match_issue(issue, articles, threshold, top_k)
            rec["linked_articles"] = matches
            if not matches:
                rec["link_status"] = "unmatched"
            elif matches[0]["score"] >= 2:
                rec["link_status"] = "linked"
            else:
                rec["link_status"] = "needs_review"
        else:
            rec["linked_articles"] = []
            rec["link_status"] = "not_applicable"
        rec["needs_human_review"] = True
        out.append(rec)
    return out


def write_jsonl(path: Path, records: List[Dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as fh:
        for rec in records:
            fh.write(json.dumps(rec, ensure_ascii=False) + "\n")


def write_report(path: Path, records: List[Dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    considered = [r for r in records if r.get("link_status") != "not_applicable"]
    status = Counter(r["link_status"] for r in considered)
    linked = status.get("linked", 0) + status.get("needs_review", 0)
    by_nizam = Counter(
        r["linked_articles"][0]["nizam"] for r in considered if r["linked_articles"])

    lines = ["# تقرير ربط المسائل الفقهية بمواد الأنظمة السعودية\n"]
    lines.append(f"- المسائل/الكتب المرشّحة للربط: **{len(considered)}**")
    lines.append(f"- مرتبطة بمادة واحدة على الأقل: **{linked}** "
                 f"({round(100*linked/max(1,len(considered)))}%)")
    lines.append(f"  - `linked` (ثقة أعلى): {status.get('linked',0)}")
    lines.append(f"  - `needs_review` (مرشّح أضعف): {status.get('needs_review',0)}")
    lines.append(f"  - `unmatched` (بلا مطابقة): {status.get('unmatched',0)}")
    lines.append("")
    lines.append("## التغطية حسب النظام")
    for nz, c in by_nizam.most_common():
        lines.append(f"- {nz}: {c}")
    lines.append("")
    lines.append("> ربط آلي مبدئي. `unmatched` تحتاج إضافة مواد مقابلة في التصدير "
                 "أو مراجعة يدوية. كل السجلات تبقى needs_human_review = true.")
    lines.append("")
    path.write_text("\n".join(lines), encoding="utf-8")


def load_jsonl(path: Path) -> List[Dict[str, Any]]:
    with path.open(encoding="utf-8") as fh:
        return [json.loads(line) for line in fh if line.strip()]


def main(argv: Optional[List[str]] = None) -> int:
    p = argparse.ArgumentParser(description="Link fiqh issues to Saudi nizam articles")
    p.add_argument("--issues", default="data/legal_issues/fiqh_issue_candidates.jsonl")
    p.add_argument("--systems", default="data/samples/saudi_systems_sample.json",
                   help="تصدير الأنظمة من حكيم (saudi_systems.json)")
    p.add_argument("--out", default="data/legal_issues/fiqh_issue_linked.jsonl")
    p.add_argument("--report", default="data/legal_issues/fiqh_link_report.md")
    p.add_argument("--threshold", type=int, default=1)
    p.add_argument("--top-k", type=int, default=3)
    args = p.parse_args(argv)

    issues = load_jsonl(Path(args.issues))
    with Path(args.systems).open(encoding="utf-8") as fh:
        systems_data = json.load(fh)

    linked = link(issues, systems_data, threshold=args.threshold, top_k=args.top_k)
    write_jsonl(Path(args.out), linked)
    write_report(Path(args.report), linked)

    considered = [r for r in linked if r.get("link_status") != "not_applicable"]
    matched = sum(1 for r in considered if r["linked_articles"])
    print("=" * 60)
    print("ربط المسائل الفقهية بمواد الأنظمة السعودية")
    print("=" * 60)
    print(f"تصدير الأنظمة      : {args.systems}")
    print(f"أنظمة: {len(systems_data.get('systems', []))} · "
          f"مواد: {len(systems_data.get('articles', []))}")
    print(f"مسائل مرشّحة للربط : {len(considered)}")
    print(f"مرتبطة بمادة       : {matched} "
          f"({round(100*matched/max(1,len(considered)))}%)")
    print(f"المخرجات: {args.out} · {args.report}")
    print("ملاحظة: ربط آلي مبدئي — needs_human_review = true.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
