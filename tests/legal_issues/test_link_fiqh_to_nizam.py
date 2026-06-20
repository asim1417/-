# -*- coding: utf-8 -*-
"""اختبارات مُطابِق المسائل الفقهية بمواد الأنظمة السعودية."""

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts" / "legal_issues"))

import link_fiqh_to_nizam as L  # noqa: E402

SYSTEMS = {
    "systems": [{"id": "SYS_MUA", "name": "نظام المعاملات المدنية"},
                {"id": "SYS_AHWAL", "name": "نظام الأحوال الشخصية"}],
    "articles": [
        {"id": "MUA-295", "system_id": "SYS_MUA", "nizam": "نظام المعاملات المدنية",
         "chapter": "العقود الناقلة للملكية > عقد البيع", "number": "295",
         "title": "تعريف عقد البيع", "keywords": ["بيع", "مبيع", "ثمن"]},
        {"id": "AHW-130", "system_id": "SYS_AHWAL", "nizam": "نظام الأحوال الشخصية",
         "chapter": "الباب الرابع: آثار الفرقة > الحضانة", "number": "130",
         "title": "أحكام الحضانة", "keywords": ["حضانة", "محضون", "حاضن"]},
    ],
}


def test_tokens_drops_stopwords_normalized():
    t = L.tokens("عقد البيع على المشتري")
    # «عقد» و«على» (←علي) كلمات توقّف؛ يبقى المعنى
    assert "علي" not in t and "عقد" not in t
    assert "البيع" in t and "المشتري" in t


def test_nizam_matches_compound():
    assert L.nizam_matches("نظام الشركات / نظام المعاملات المدنية",
                           "نظام المعاملات المدنية")
    assert L.nizam_matches("نظام الأحوال الشخصية", "نظام الأحوال الشخصية")
    assert not L.nizam_matches("نظام الإثبات", "نظام المعاملات المدنية")


def test_match_links_bay_to_real_article():
    issue = {"level": 4, "book": "البيع", "parent_title": "أركان البيع",
             "suggested_saudi_nizam": "نظام المعاملات المدنية",
             "suggested_saudi_nizam_chapter": "العقود الناقلة للملكية > عقد البيع"}
    arts = L.index_articles(SYSTEMS)
    matches = L.match_issue(issue, arts, threshold=1, top_k=3)
    assert matches and matches[0]["article_id"] == "MUA-295"


def test_match_respects_nizam_boundary():
    # مسألة حضانة يجب ألا تُربط بمادة في نظام المعاملات المدنية
    issue = {"level": 4, "book": "الحضانة", "parent_title": "شروط الحاضن",
             "suggested_saudi_nizam": "نظام الأحوال الشخصية",
             "suggested_saudi_nizam_chapter": "الباب الرابع: آثار الفرقة > الحضانة"}
    arts = L.index_articles(SYSTEMS)
    matches = L.match_issue(issue, arts, threshold=1, top_k=3)
    assert matches and matches[0]["article_id"] == "AHW-130"
    assert all(m["nizam"] == "نظام الأحوال الشخصية" for m in matches)


def test_link_sets_status_and_keeps_review_flag():
    issues = [
        {"level": 4, "book": "البيع", "parent_title": "أركان البيع",
         "suggested_saudi_nizam": "نظام المعاملات المدنية",
         "suggested_saudi_nizam_chapter": "العقود الناقلة للملكية > عقد البيع"},
        {"level": 4, "book": "كتاب غير موجود", "parent_title": "باب",
         "suggested_saudi_nizam": "نظام غير معروف",
         "suggested_saudi_nizam_chapter": "لا يوجد"},
        {"level": 1, "book": "", "parent_title": "",
         "suggested_saudi_nizam": "", "suggested_saudi_nizam_chapter": ""},
    ]
    out = L.link(issues, SYSTEMS, threshold=1, top_k=3)
    assert out[0]["link_status"] in ("linked", "needs_review")
    assert out[0]["linked_articles"][0]["article_id"] == "MUA-295"
    assert out[1]["link_status"] == "unmatched"
    assert out[2]["link_status"] == "not_applicable"
    assert all(r["needs_human_review"] is True for r in out)


def test_no_false_cross_contract_match():
    # الوكالة لا يوجد لها مادة في العينة ⇒ يجب ألا تُربط بمادة البيع خطأً
    issue = {"level": 4, "book": "الوكالة", "parent_title": "أركان الوكالة",
             "suggested_saudi_nizam": "نظام المعاملات المدنية",
             "suggested_saudi_nizam_chapter": "العقود الواردة على العمل > عقد الوكالة"}
    arts = L.index_articles(SYSTEMS)
    matches = L.match_issue(issue, arts, threshold=1, top_k=3)
    assert matches == []


if __name__ == "__main__":
    import traceback
    funcs = [(n, o) for n, o in sorted(globals().items())
             if n.startswith("test_") and callable(o)]
    p = f = 0
    for n, fn in funcs:
        try:
            fn(); p += 1; print(f"PASS  {n}")
        except Exception:
            f += 1; print(f"FAIL  {n}"); traceback.print_exc()
    print(f"\n{p} passed, {f} failed")
    sys.exit(1 if f else 0)
