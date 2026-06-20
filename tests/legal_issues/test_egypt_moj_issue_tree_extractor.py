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


# --------------------------------------------------------------------------- #
# HTML parser + crawl pipeline (offline fixture)
#
# يتحقق من أن مُحلّل HTML يلتقط الفهارس العامة كما هو مصمم، دون أي شبكة،
# عبر تمرير صفحة فهرس تمثيلية تشبه بنية الموسوعة القانونية المصرية.
# --------------------------------------------------------------------------- #

_FIXTURE_HTML = """
<html lang="ar" dir="rtl">
<head><title>الموسوعة القانونية المصرية - فهرس الأقسام</title></head>
<body>
  <nav class="breadcrumb">
    <ol>
      <li>الرئيسية</li>
      <li>الموسوعة المدنية</li>
      <li>الدفوع</li>
    </ol>
  </nav>
  <h1>الموسوعة المدنية</h1>
  <h2>الدفوع المدنية</h2>
  <h3>البطلان والمواعيد المدنية</h3>
  <ul class="menu">
    <li><a href="/encyclopedia/civil/defenses/inadmissibility">الدفع بعدم القبول</a></li>
    <li><a href="/encyclopedia/civil/defenses/jurisdiction">الدفع بعدم الاختصاص</a></li>
    <li><a href="/encyclopedia/prosecution/classification/misdemeanors">قيود وأوصاف الجنح</a></li>
    <li><a href="/encyclopedia/inheritance">قواعد المواريث</a></li>
    <li><a href="/login">تسجيل الدخول</a></li>
    <li><a href="/about">عن الموقع</a></li>
  </ul>
</body>
</html>
"""


def _parse_fixture():
    p = ex.StructureParser()
    p.feed(_FIXTURE_HTML)
    return p


def test_parser_extracts_title_and_headings():
    p = _parse_fixture()
    assert "الموسوعة القانونية المصرية" in p.title
    tags = {tag for tag, _ in p.headings}
    texts = [t for _, t in p.headings]
    assert {"h1", "h2", "h3"} <= tags
    assert "الدفوع المدنية" in texts


def test_parser_extracts_breadcrumbs_and_links_and_menu():
    p = _parse_fixture()
    assert "الدفوع" in p.breadcrumbs
    assert "الموسوعة المدنية" in p.breadcrumbs
    link_texts = [t for _, t in p.links]
    assert "الدفع بعدم القبول" in link_texts
    # عناصر القائمة تُلتقط أيضًا كعناصر li
    assert any("قيود وأوصاف الجنح" in li for li in p.list_items)


def test_crawl_pipeline_offline_produces_valid_records():
    # محاكاة نتيجة صفحة مزحوفة دون شبكة، ثم تمريرها بنفس مسار الزحف الحي
    p = _parse_fixture()
    page = {
        "url": "https://w.emj-eg.com/encyclopedia/civil/defenses",
        "title": p.title,
        "headings": p.headings,
        "list_items": p.list_items,
        "links": p.links,
        "breadcrumbs": p.breadcrumbs,
    }
    records = ex.crawl_results_to_records([page])
    assert records, "يجب أن ينتج المسار عقدًا قانونية من الفهرس العام"
    for r in records:
        assert ex.validate_record(r) == []
        assert r["source_url"].startswith("https://w.emj-eg.com/")
        assert r["evidence"]["selector"] in ("h1", "h2", "h3", "menu", "link")

    titles = {r["node_title"] for r in records}
    # عناوين قانونية واضحة يجب أن تُلتقط وتُصنّف
    assert "الدفع بعدم القبول" in titles
    assert "قيود وأوصاف الجنح" in titles
    types = {r["node_title"]: r["node_type"] for r in records}
    assert types["قيود وأوصاف الجنح"] == "criminal_classification"

    # الروابط/العناوين غير القانونية (تسجيل الدخول، عن الموقع) تُستبعد
    assert "تسجيل الدخول" not in titles
    assert "عن الموقع" not in titles


def test_blocked_links_not_enqueued_in_pipeline():
    # رابط فيه نمط محظور يجب ألا يُصنّف ضمن العقد حتى لو ظهر كنص قانوني
    crawler = ex.SafeCrawler(
        allowed_domains=["w.emj-eg.com"],
        blocked_patterns=ex.DEFAULT_BLOCKED_PATTERNS,
        max_pages=5, delay=0, timeout=5,
    )
    assert crawler.is_blocked("https://w.emj-eg.com/account/defenses")
    assert not crawler.is_blocked("https://w.emj-eg.com/encyclopedia/defenses")


# --------------------------------------------------------------------------- #
# JSON API ingestion
# --------------------------------------------------------------------------- #

def test_json_to_records_extracts_nested_legal_nodes():
    payload = {
        "result": [
            {"name": "موسوعة النيابة", "children": [
                {"title": "قيود وأوصاف الجنح"},
                {"title": "أوامر النيابة بالحفظ"},
            ]},
            {"label": "فتاوى مجلس الدولة", "items": [
                {"label": "فتاوى العقود الإدارية"},
            ]},
            {"title": "اتصل بنا"},  # بلا مؤشّر قانوني — يجب استبعادها
        ]
    }
    recs = ex.json_to_records(payload, "https://serviceapi.egyptianlaws.com/api/x")
    titles = {r["node_title"] for r in recs}
    assert "قيود وأوصاف الجنح" in titles
    assert "فتاوى العقود الإدارية" in titles
    assert "اتصل بنا" not in titles
    for r in recs:
        assert ex.validate_record(r) == []
        assert r["evidence"]["selector"] == "json"
    types = {r["node_title"]: r["node_type"] for r in recs}
    assert types["قيود وأوصاف الجنح"] == "criminal_classification"


# --------------------------------------------------------------------------- #
# sitemap parsing
# --------------------------------------------------------------------------- #

def test_parse_sitemap_xml():
    xml = """<?xml version="1.0"?>
    <urlset>
      <url><loc>https://w.emj-eg.com/civil/defenses</loc></url>
      <url><loc>https://w.emj-eg.com/criminal/classification</loc></url>
    </urlset>"""
    locs = ex.SafeCrawler.parse_sitemap_xml(xml)
    assert "https://w.emj-eg.com/civil/defenses" in locs
    assert len(locs) == 2


# --------------------------------------------------------------------------- #
# offline ingestion (ingest_local)
# --------------------------------------------------------------------------- #

def test_ingest_local_html_and_json(tmp_path=None):
    import tempfile
    base = tempfile.mkdtemp()
    d = Path(base)
    (d / "page.html").write_text(
        "<html><head><title>الموسوعة المدنية</title></head><body>"
        "<h2>الدفوع المدنية</h2>"
        "<ul><li><a href='/x'>الدفع بالتقادم</a></li>"
        "<li><a href='/login'>دخول</a></li></ul></body></html>",
        encoding="utf-8",
    )
    (d / "page.url").write_text("https://w.emj-eg.com/civil", encoding="utf-8")
    (d / "api.json").write_text(
        '{"items":[{"title":"قيود وأوصاف الجنايات"}]}', encoding="utf-8"
    )
    recs = ex.ingest_local(str(d))
    titles = {r["node_title"] for r in recs}
    assert "الدفوع المدنية" in titles
    assert "الدفع بالتقادم" in titles
    assert "قيود وأوصاف الجنايات" in titles
    # رابط دخول المشتركين لا يُلتقط كعقدة قانونية
    assert "دخول" not in titles
    for r in recs:
        assert ex.validate_record(r) == []
    # الرابط المصدر يُؤخذ من ملف .url المرافق
    html_recs = [r for r in recs if r["node_title"] == "الدفوع المدنية"]
    assert html_recs and html_recs[0]["source_url"] == "https://w.emj-eg.com/civil"


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
