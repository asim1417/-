# -*- coding: utf-8 -*-
"""اختبارات بسيطة لمستخرج شجرة المسائل القانونية المصرية.

تُشغَّل عبر pytest، وتعمل أيضًا كسكريبت مستقل (python -m / مباشرة) بلا تبعيات.
"""

import json
import sys
from pathlib import Path

# إتاحة استيراد السكريبت بغضّ النظر عن مكان التشغيل
ROOT = Path(__file__).resolve().parents[2]
SCRIPT_DIR = ROOT / "scripts" / "legal_issues"
sys.path.insert(0, str(SCRIPT_DIR))

import egypt_moj_issue_tree_extractor as ex  # noqa: E402


# --------------------------------------------------------------------------- #
# normalize_arabic
# --------------------------------------------------------------------------- #

def test_normalize_removes_tashkeel():
    assert ex.normalize_arabic("الدَّفْعُ بِالبُطْلانِ") == "الدفع بالبطلان"


def test_normalize_unifies_alef():
    assert ex.normalize_arabic("أحكام إدارية آمنة") == "احكام اداريه امنه"


def test_normalize_unifies_yaa_and_alef_maqsura():
    # ى -> ي ، ة -> ه
    assert ex.normalize_arabic("دعوى مدنية") == "دعوي مدنيه"


def test_normalize_removes_tatweel_and_symbols():
    assert ex.normalize_arabic("الدفـــوع، المدنية!!") == "الدفوع المدنيه"


def test_normalize_handles_empty():
    assert ex.normalize_arabic("") == ""
    assert ex.normalize_arabic(None) == ""


def test_normalize_collapses_spaces():
    assert ex.normalize_arabic("  المواعيد    القانونية  ") == "المواعيد القانونيه"


# --------------------------------------------------------------------------- #
# classify_node_type
# --------------------------------------------------------------------------- #

def test_classify_root_and_branch_by_level():
    assert ex.classify_node_type("الموسوعة القانونية المصرية", level=0) == "encyclopedia_root"
    assert ex.classify_node_type("موسوعة النيابة", level=1) == "encyclopedia_branch"


def test_classify_defense():
    assert ex.classify_node_type("الدفوع المدنية", branch="الموسوعة المدنية") == "defense_issue"
    assert ex.classify_node_type("الدفع بالبطلان", branch="الموسوعة الجنائية") == "defense_issue"


def test_classify_criminal_classification():
    assert (
        ex.classify_node_type("قيود وأوصاف الجنح", branch="موسوعة النيابة")
        == "criminal_classification"
    )


def test_classify_deadline_and_procedural():
    assert ex.classify_node_type("المواعيد القانونية للطعن") == "legal_deadline"
    assert ex.classify_node_type("بطلان صحيفة الدعوى") == "procedural_issue"


def test_classify_reasoning_template():
    assert (
        ex.classify_node_type("حيثيات جنائية", branch="موسوعة الأحكام")
        == "reasoning_template"
    )


def test_classify_inheritance_family_labor():
    assert ex.classify_node_type("قواعد المواريث") == "inheritance_issue"
    assert ex.classify_node_type("حيثيات الأسرة", branch="موسوعة الأحكام") in (
        "reasoning_template",
        "family_issue",
    )
    assert ex.classify_node_type("منازعات العمل") == "labor_issue"


def test_classify_real_estate_and_admin_and_dictionary():
    assert ex.classify_node_type("منشورات الشهر العقاري") == "real_estate_documentation"
    assert ex.classify_node_type("فتاوى مجلس الدولة") == "administrative_issue"
    assert ex.classify_node_type("المحكمة الإدارية العليا") == "administrative_issue"
    assert ex.classify_node_type("القاموس القانوني") == "legal_dictionary"


def test_classify_unknown():
    assert ex.classify_node_type("xyz صفحة عامة جدا") == "unknown"


def test_classify_returns_valid_type():
    for title in [
        "الدفوع", "حيثيات", "قيود وأوصاف", "المواريث", "الشهر العقاري",
        "موسوعة التشريعات", "أحكام النقض",
    ]:
        assert ex.classify_node_type(title) in ex.NODE_TYPES


# --------------------------------------------------------------------------- #
# suggest_saudi_domain
# --------------------------------------------------------------------------- #

def test_saudi_domain_civil_defense():
    d = ex.suggest_saudi_domain("الدفوع المدنية", branch="الموسوعة المدنية")
    assert "المرافعات" in d or "المعاملات المدنية" in d


def test_saudi_domain_criminal_defense():
    d = ex.suggest_saudi_domain("الدفوع الجنائية", branch="الموسوعة الجنائية")
    assert "الجزائي" in d or "الإجراءات الجزائية" in d


def test_saudi_domain_deadlines():
    d = ex.suggest_saudi_domain("البطلان والمواعيد")
    assert "المرافعات" in d


def test_saudi_domain_admin():
    assert "الإداري" in ex.suggest_saudi_domain("فتاوى مجلس الدولة")
    assert "الإداري" in ex.suggest_saudi_domain("المحكمة الإدارية العليا")


def test_saudi_domain_inheritance_and_realestate():
    assert "الأحوال الشخصية" in ex.suggest_saudi_domain("قواعد المواريث")
    assert "التوثيق" in ex.suggest_saudi_domain("منشورات الشهر العقاري")


def test_saudi_domain_dictionary():
    assert "مكنز" in ex.suggest_saudi_domain("القاموس القانوني")


# --------------------------------------------------------------------------- #
# build_issue_path
# --------------------------------------------------------------------------- #

def test_path_civil_defense_example():
    assert (
        ex.build_issue_path("الموسوعة المدنية", "الدفوع المدنية")
        == "المرافعات والإجراءات > الدفوع > الدفوع المدنية"
    )


def test_path_prosecution_classification_example():
    assert (
        ex.build_issue_path("موسوعة النيابة", "قيود وأوصاف الجنح")
        == "الجزائي > التكييف الجنائي > قيود وأوصاف الجنح"
    )


def test_path_has_three_levels():
    p = ex.build_issue_path("الموسوعة المدنية", "قواعد المواريث")
    assert p.count(">") == 2


# --------------------------------------------------------------------------- #
# confidence
# --------------------------------------------------------------------------- #

def test_confidence_levels():
    assert ex.compute_confidence("الدفوع المدنية", "defense_issue") == 0.90
    assert ex.compute_confidence("قسم عام", "defense_issue") == 0.75
    assert ex.compute_confidence("بند تشريعي عام", "legislation_category") == 0.60
    assert ex.compute_confidence("صفحة غامضة", "unknown") == 0.50


# --------------------------------------------------------------------------- #
# JSONL schema validation
# --------------------------------------------------------------------------- #

def test_build_node_record_schema():
    rec = ex.build_node_record(
        title="الدفوع المدنية",
        level=2,
        branch="الموسوعة المدنية",
        parent_title="الموسوعة المدنية",
        source_url="seed://x",
        selector="seed",
    )
    assert ex.validate_record(rec) == []
    assert rec["jurisdiction"] == "EG"
    assert rec["mapping_type"] == "structural_seed"
    assert rec["needs_human_review"] is True
    assert set(rec["evidence"]) == {"url", "selector", "text_snippet"}


def test_seed_records_all_valid():
    recs = [r for r, _ in ex.iter_seed_records(ex.SEED_TREE)]
    assert len(recs) > 20
    for r in recs:
        assert ex.validate_record(r) == []
        # كل سجل قابل للتسلسل JSON
        json.loads(json.dumps(r, ensure_ascii=False))


def test_all_node_types_in_allowed_set():
    recs = [r for r, _ in ex.iter_seed_records(ex.SEED_TREE)]
    for r in recs:
        assert r["node_type"] in ex.NODE_TYPES


def test_blocked_pattern_filter():
    crawler = ex.SafeCrawler(
        allowed_domains=["w.emj-eg.com"],
        blocked_patterns=ex.DEFAULT_BLOCKED_PATTERNS,
        max_pages=5, delay=0, timeout=5,
    )
    assert crawler.is_blocked("https://w.emj-eg.com/login")
    assert crawler.is_blocked("https://w.emj-eg.com/user/account")
    assert not crawler.is_blocked("https://w.emj-eg.com/encyclopedia/civil")
    assert crawler.is_allowed_domain("https://w.emj-eg.com/x")
    assert not crawler.is_allowed_domain("https://evil.example.com/x")


if __name__ == "__main__":
    import traceback

    funcs = [
        (name, obj)
        for name, obj in sorted(globals().items())
        if name.startswith("test_") and callable(obj)
    ]
    passed = failed = 0
    for name, fn in funcs:
        try:
            fn()
            passed += 1
            print(f"PASS  {name}")
        except Exception:
            failed += 1
            print(f"FAIL  {name}")
            traceback.print_exc()
    print(f"\n{passed} passed, {failed} failed")
    sys.exit(1 if failed else 0)
