#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Egyptian Legal Encyclopedia Issue Tree Extractor.

استخراج "شجرة مسائل قانونية" من البنية العامة للموسوعة القانونية المصرية،
لاستخدامها كبذرة هيكلية أولية (structural seed) في Hakeem Legal Issues Core.

هذه الأداة:
  * تتعامل فقط مع الفهارس العامة والعناوين والقوائم وروابط الأقسام المتاحة علنًا.
  * تحترم robots.txt متى توفّر.
  * لا تتجاوز تسجيل الدخول، ولا تستخدم أي بيانات اعتماد، ولا تكسر أي حماية،
    ولا تسحب محتوى مغلقًا أو خاصًا بالمشتركين، ولا تنفّذ scraping كثيفًا.
  * تتجنّب أي روابط تحتوي أنماطًا تدل على مناطق محمية (login/account/...).

المخرجات بذرة هيكلية مصرية تحتاج مواءمة سعودية بشرية قبل اعتمادها،
وليست قانونًا سعوديًا معتمدًا.

التشغيل التجريبي:
    python scripts/legal_issues/egypt_moj_issue_tree_extractor.py \
        --max-pages 5 --delay 2 \
        --out-jsonl data/legal_issues/egypt_moj_issue_candidates.jsonl \
        --out-tree  data/legal_issues/egypt_moj_issue_tree_seed.json \
        --log       data/legal_issues/egypt_moj_run_log.json

يعتمد فقط على المكتبة القياسية لبايثون (لا تبعيات خارجية).
"""

from __future__ import annotations

import argparse
import csv
import json
import logging
import re
import socket
import sys
import time
import unicodedata
from collections import Counter, OrderedDict
from html.parser import HTMLParser
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Tuple
from urllib import robotparser
from urllib.error import HTTPError, URLError
from urllib.parse import urljoin, urlparse
from urllib.request import Request, urlopen

# --------------------------------------------------------------------------- #
# ثوابت عامة
# --------------------------------------------------------------------------- #

USER_AGENT = "HakeemLegalIssuesResearchBot/0.1"
SOURCE_NAME = "Egyptian Legal Encyclopedia"
JURISDICTION = "EG"
MAPPING_TYPE = "structural_seed"

DEFAULT_BLOCKED_PATTERNS = [
    "login",
    "account",
    "subscription",
    "payment",
    "signin",
    "register",
    "auth",
    "profile",
]

# مسارات الإخراج الافتراضية
DEFAULT_CONFIG = "config/legal_issues/egypt_moj_sources.json"
DEFAULT_OUT_JSONL = "data/legal_issues/egypt_moj_issue_candidates.jsonl"
DEFAULT_OUT_TREE = "data/legal_issues/egypt_moj_issue_tree_seed.json"
DEFAULT_OUT_CSV = "data/legal_issues/egypt_moj_issue_candidates.csv"
DEFAULT_OUT_SAMPLE = "data/samples/egypt_moj_issue_tree_sample.jsonl"
DEFAULT_OUT_REPORT = "data/legal_issues/egypt_moj_extraction_report.md"
DEFAULT_LOG = "data/legal_issues/egypt_moj_run_log.json"

# أنواع العقد المسموح بها (node_type)
NODE_TYPES = {
    "encyclopedia_root",
    "encyclopedia_branch",
    "legislation_category",
    "judgment_category",
    "prosecution_category",
    "civil_issue",
    "criminal_issue",
    "defense_issue",
    "procedural_issue",
    "reasoning_template",
    "legal_deadline",
    "criminal_classification",
    "family_issue",
    "labor_issue",
    "inheritance_issue",
    "real_estate_documentation",
    "administrative_issue",
    "legal_dictionary",
    "unknown",
}

logger = logging.getLogger("egypt_moj_extractor")


# --------------------------------------------------------------------------- #
# 3) تطبيع النص العربي
# --------------------------------------------------------------------------- #

# علامات التشكيل والحركات (بما في ذلك التنوين والشدة والسكون)
_TASHKEEL = re.compile(r"[ؗ-ًؚ-ْٓ-ٰٟ]")
_TATWEEL = re.compile(r"ـ")  # حرف التطويل (ـ)
# علامات الترقيم العربية (داخل كتلة يونيكود العربية، فتحتاج إزالة صريحة)
_AR_PUNCT = re.compile("[،؛؞؟٪٫٬٭۔«»…]")
# رموز زائدة شائعة في عناوين الفهارس (مع الإبقاء على الحروف العربية والأرقام)
_EXTRA_SYMBOLS = re.compile(
    r"[^؀-ۿ0-9A-Za-z\s]+"
)
_MULTISPACE = re.compile(r"\s+")


def normalize_arabic(text: Optional[str]) -> str:
    """تطبيع النص العربي القانوني دون تشويهه.

    يقوم بـ:
      * إزالة التشكيل (الحركات والتنوين والشدة والسكون...).
      * توحيد الألف: أ، إ، آ، ٱ ← ا.
      * توحيد الياء والألف المقصورة: ى ← ي، وكذلك ئ ← ي عند الحاجة.
      * توحيد التاء المربوطة والهاء بشكل محافظ (ة تبقى ولكن نوحّدها للمطابقة).
      * إزالة التطويل (ـ).
      * تنظيف المسافات وإزالة الرموز الزائدة.

    تُعيد سلسلة نظيفة قابلة للمطابقة مع الحفاظ على المعنى القانوني.
    """
    if not text:
        return ""

    # توحيد صيغة يونيكود
    text = unicodedata.normalize("NFKC", text)

    # إزالة التشكيل والتطويل
    text = _TASHKEEL.sub("", text)
    text = _TATWEEL.sub("", text)

    # توحيد الألف بأشكالها
    text = re.sub(r"[آأإٱ]", "ا", text)  # آ أ إ ٱ ← ا
    # توحيد الألف المقصورة والياء
    text = text.replace("ى", "ي")  # ى ← ي
    # توحيد الهمزة على الياء/الواو بشكل محافظ للمطابقة
    text = text.replace("ئ", "ي")  # ئ ← ي
    text = text.replace("ؤ", "و")  # ؤ ← و
    # توحيد التاء المربوطة إلى هاء للمطابقة فقط (محافظ)
    # نُبقي التاء المربوطة كما هي في العرض، لكن نطبّعها للمكنز:
    text = text.replace("ة", "ه")  # ة ← ه

    # إزالة علامات الترقيم العربية ثم باقي الرموز الزائدة مع الإبقاء على المسافات
    text = _AR_PUNCT.sub(" ", text)
    text = _EXTRA_SYMBOLS.sub(" ", text)

    # تنظيف المسافات
    text = _MULTISPACE.sub(" ", text).strip()
    return text


# --------------------------------------------------------------------------- #
# 5) تصنيف node_type
# --------------------------------------------------------------------------- #

def _has(norm: str, *keywords: str) -> bool:
    """تحقّق من وجود أي كلمة مفتاحية داخل نص مُطبّع.

    تُطبَّع الكلمات المفتاحية أيضًا لضمان المطابقة (مثل توحيد الهمزة والياء)،
    حتى لو كُتبت الكلمات بأشكال إملائية مختلفة في الكود.
    """
    return any(normalize_arabic(k) in norm for k in keywords)


def classify_node_type(
    title: str,
    branch: str = "",
    level: Optional[int] = None,
) -> str:
    """تصنيف العقدة إلى أحد قيم node_type المسموح بها.

    يعتمد على الكلمات المفتاحية في العنوان المطبّع وسياق الفرع والمستوى.
    """
    norm = normalize_arabic(title)
    bnorm = normalize_arabic(branch)
    ctx = (norm + " " + bnorm).strip()

    if not norm:
        return "unknown"

    # المستوى صفر = الجذر
    if level == 0:
        return "encyclopedia_root"

    # المستوى الأول = فرع موسوعي
    if level == 1:
        return "encyclopedia_branch"

    # تصنيفات أكثر تحديدًا حسب الكلمات المفتاحية (الأكثر تخصصًا أولًا)

    # الأسرة والأحوال الشخصية والمواريث (قبل العام لتفادي التداخل)
    if _has(ctx, "ميراث", "مواريث", "تركه", "تركات", "انصبه", "فرائض"):
        return "inheritance_issue"
    if _has(norm, "اسره", "احوال شخصيه", "حضانه", "نفقه", "طلاق", "زواج", "نسب"):
        return "family_issue"
    if _has(norm, "عمل", "عمال", "عماليه", "اجور", "فصل تعسفي"):
        return "labor_issue"

    # الشهر العقاري والتوثيق والعقار
    if _has(ctx, "شهر عقاري", "الشهر العقاري", "توثيق", "تسجيل عقاري", "منشورات الشهر"):
        return "real_estate_documentation"

    # القاموس / المعجم القانوني
    if _has(norm, "قاموس", "معجم", "مصطلح", "مصطلحات", "مكنز"):
        return "legal_dictionary"

    # الدفوع
    if _has(norm, "دفع", "دفوع"):
        return "defense_issue"

    # القيود والأوصاف والتكييف الجنائي
    if _has(ctx, "قيد", "قيود", "وصف", "اوصاف", "تكييف") and _has(
        ctx, "جنايه", "جنايات", "جنحه", "جنح", "مخالفه", "مخالفات", "نيابه", "جنائي"
    ):
        return "criminal_classification"
    if _has(norm, "تكييف", "قيود واوصاف", "قيد ووصف"):
        return "criminal_classification"

    # البطلان والمواعيد (إجرائي / مواعيد قانونية)
    if _has(norm, "ميعاد", "مواعيد", "تقادم", "سقوط"):
        return "legal_deadline"
    if _has(norm, "بطلان", "اجراءات", "اجرائي", "انعقاد الخصومه"):
        return "procedural_issue"

    # الحيثيات ونماذج الأحكام (قوالب التسبيب)
    if _has(norm, "حيثيه", "حيثيات", "اسباب الحكم", "تسبيب", "نموذج حكم", "نماذج الاحكام", "صيغ"):
        return "reasoning_template"

    # الإداري والفتاوى والقضاء الإداري
    if _has(ctx, "اداري", "اداريه", "مجلس الدوله", "فتوى", "فتاوى", "القضاء الاداري", "الاداريه العليا"):
        return "administrative_issue"

    # التشريعات والقوانين
    if _has(ctx, "تشريع", "تشريعات", "قانون", "قوانين", "لائحه", "لوائح", "مرسوم", "قرار جمهوري"):
        return "legislation_category"

    # الأحكام والسوابق القضائية
    if _has(ctx, "نقض", "دستوريه", "احكام", "حكم", "مبادي", "سابقه", "سوابق"):
        return "judgment_category"

    # النيابة
    if _has(ctx, "نيابه", "تحقيق", "امر حفظ", "التصرف في التحقيق"):
        return "prosecution_category"

    # سياق جنائي / مدني عام
    if _has(ctx, "جنائي", "جنائيه", "جزائي", "عقوبات", "جنايه", "جنحه"):
        return "criminal_issue"
    if _has(ctx, "مدني", "مدنيه", "معاملات", "عقد", "عقود", "التزام", "مسؤوليه"):
        return "civil_issue"

    return "unknown"


# --------------------------------------------------------------------------- #
# 6) مواءمة سعودية مبدئية (suggested_saudi_domain)
# --------------------------------------------------------------------------- #

def suggest_saudi_domain(title: str, branch: str = "", node_type: str = "") -> str:
    """اقتراح المجال السعودي المبدئي وفق قواعد تقريبية.

    قواعد تقريبية فقط — تحتاج مراجعة بشرية (needs_human_review = true).
    """
    norm = normalize_arabic(title)
    bnorm = normalize_arabic(branch)
    ctx = (norm + " " + bnorm).strip()

    is_criminal = _has(ctx, "جنائي", "جنائيه", "جزائي", "جنايه", "جنح", "جنحه", "عقوبات", "نيابه")
    is_civil = _has(ctx, "مدني", "مدنيه", "معاملات", "عقد", "التزام")

    # الدفوع
    if _has(norm, "دفع", "دفوع"):
        if is_criminal:
            return "الإجراءات الجزائية / الجزائي"
        return "المرافعات الشرعية / المعاملات المدنية"

    # الحيثيات (مع تفريع الأسرة والعمل)
    if _has(norm, "حيثيه", "حيثيات", "تسبيب", "اسباب الحكم"):
        if _has(ctx, "اسره", "احوال شخصيه", "حضانه", "نفقه", "طلاق"):
            return "الأحوال الشخصية"
        if _has(ctx, "عمل", "عمال", "عماليه"):
            return "نظام العمل"
        if is_criminal:
            return "الجزائي / الإجراءات الجزائية"
        return "المعاملات المدنية / المرافعات"

    # البطلان والمواعيد
    if _has(norm, "بطلان", "ميعاد", "مواعيد", "تقادم", "سقوط"):
        return "المرافعات / الإجراءات الجزائية / المحاكم التجارية"

    # القيود والأوصاف والتكييف
    if _has(ctx, "قيد", "قيود", "وصف", "اوصاف", "تكييف"):
        return "الجزائي"

    # فتاوى مجلس الدولة
    if _has(ctx, "فتوى", "فتاوى", "مجلس الدوله"):
        return "الإداري / المنازعات الحكومية"

    # القضاء الإداري / المحكمة الإدارية العليا
    if _has(ctx, "اداري", "اداريه", "القضاء الاداري", "الاداريه العليا"):
        return "الإداري"

    # المواريث والتركات
    if _has(ctx, "ميراث", "مواريث", "تركه", "تركات", "فرائض"):
        return "الأحوال الشخصية / التركات"

    # الأسرة
    if _has(norm, "اسره", "احوال شخصيه", "حضانه", "نفقه", "طلاق", "نسب"):
        return "الأحوال الشخصية"

    # العمل
    if _has(norm, "عمل", "عمال", "عماليه", "اجور"):
        return "نظام العمل"

    # الشهر العقاري والتوثيق
    if _has(ctx, "شهر عقاري", "الشهر العقاري", "توثيق", "تسجيل عقاري"):
        return "التوثيق / العقار"

    # القاموس القانوني
    if _has(norm, "قاموس", "معجم", "مصطلح", "مصطلحات", "مكنز"):
        return "مفاهيم قانونية / مكنز"

    # التشريعات
    if _has(ctx, "تشريع", "تشريعات", "قانون", "قوانين", "لائحه"):
        return "الأنظمة واللوائح"

    # الأحكام والسوابق
    if _has(ctx, "نقض", "دستوريه", "احكام", "سوابق", "مبادي"):
        return "السوابق والمبادئ القضائية"

    if is_criminal:
        return "الجزائي"
    if is_civil:
        return "المعاملات المدنية / المرافعات"

    return "يحتاج تحديد بشري"


# --------------------------------------------------------------------------- #
# 7) suggested_hakeem_issue_path
# --------------------------------------------------------------------------- #

def build_issue_path(branch: str, title: str) -> str:
    """بناء مسار المسألة المقترح في حكيم على شكل: قمة > تصنيف > مسألة.

    أمثلة:
        build_issue_path("الموسوعة المدنية", "الدفوع المدنية")
            -> "المرافعات والإجراءات > الدفوع > الدفوع المدنية"
        build_issue_path("موسوعة النيابة", "قيود وأوصاف الجنح")
            -> "الجزائي > التكييف الجنائي > قيود وأوصاف الجنح"
    """
    leaf = (title or "").strip()
    norm = normalize_arabic(title)
    bnorm = normalize_arabic(branch)
    ctx = (norm + " " + bnorm).strip()

    is_criminal = _has(ctx, "جنائي", "جنائيه", "جزائي", "جنايه", "جنح", "جنحه", "عقوبات", "نيابه")

    def path(*parts: str) -> str:
        cleaned = [p.strip() for p in parts if p and p.strip()]
        return " > ".join(cleaned)

    # القيود والأوصاف / التكييف
    if _has(ctx, "قيد", "قيود", "وصف", "اوصاف", "تكييف"):
        return path("الجزائي", "التكييف الجنائي", leaf)

    # الدفوع
    if _has(norm, "دفع", "دفوع"):
        if is_criminal:
            return path("الجزائي", "الدفوع", leaf)
        return path("المرافعات والإجراءات", "الدفوع", leaf)

    # الحيثيات / التسبيب / نماذج الأحكام
    if _has(norm, "حيثيه", "حيثيات", "تسبيب", "اسباب الحكم", "نموذج حكم", "نماذج", "صيغ"):
        if _has(ctx, "اسره", "احوال شخصيه", "حضانه", "نفقه", "طلاق"):
            return path("الأحوال الشخصية", "التسبيب والحيثيات", leaf)
        if _has(ctx, "عمل", "عمال", "عماليه"):
            return path("نظام العمل", "التسبيب والحيثيات", leaf)
        if is_criminal:
            return path("الجزائي", "التسبيب والحيثيات", leaf)
        return path("المعاملات المدنية", "التسبيب والحيثيات", leaf)

    # البطلان والمواعيد
    if _has(norm, "بطلان", "ميعاد", "مواعيد", "تقادم", "سقوط"):
        top = "الجزائي" if is_criminal else "المرافعات والإجراءات"
        return path(top, "البطلان والمواعيد", leaf)

    # المواريث والتركات
    if _has(ctx, "ميراث", "مواريث", "تركه", "تركات", "فرائض"):
        return path("الأحوال الشخصية", "التركات والمواريث", leaf)

    # الأسرة
    if _has(norm, "اسره", "احوال شخصيه", "حضانه", "نفقه", "طلاق", "نسب"):
        return path("الأحوال الشخصية", "قضايا الأسرة", leaf)

    # العمل
    if _has(norm, "عمل", "عمال", "عماليه", "اجور"):
        return path("نظام العمل", "المنازعات العمالية", leaf)

    # الشهر العقاري / التوثيق
    if _has(ctx, "شهر عقاري", "الشهر العقاري", "توثيق", "تسجيل عقاري"):
        return path("التوثيق والعقار", "الشهر العقاري", leaf)

    # فتاوى مجلس الدولة
    if _has(ctx, "فتوى", "فتاوى", "مجلس الدوله"):
        return path("الإداري", "الفتاوى", leaf)

    # القضاء الإداري / المحكمة الإدارية العليا
    if _has(ctx, "اداري", "اداريه", "القضاء الاداري", "الاداريه العليا"):
        return path("الإداري", "القضاء الإداري", leaf)

    # القاموس القانوني
    if _has(norm, "قاموس", "معجم", "مصطلح", "مصطلحات", "مكنز"):
        return path("المفاهيم القانونية", "المكنز القانوني", leaf)

    # التشريعات
    if _has(ctx, "تشريع", "تشريعات", "قانون", "قوانين", "لائحه"):
        return path("الأنظمة واللوائح", "التشريعات", leaf)

    # الأحكام والسوابق
    if _has(ctx, "نقض", "دستوريه", "احكام", "سوابق", "مبادي"):
        return path("السوابق والمبادئ القضائية", "الأحكام", leaf)

    # سياق عام
    if is_criminal:
        return path("الجزائي", "مسائل عامة", leaf)
    return path("المعاملات المدنية", "مسائل عامة", leaf)


# --------------------------------------------------------------------------- #
# 8) confidence
# --------------------------------------------------------------------------- #

# عناوين واضحة ومباشرة تستحق ثقة عالية — كل عنصر مجموعة كلمات يجب توافرها كلها
_CLEAR_TITLE_TOKEN_GROUPS = [
    ("دفوع", "مدني"),
    ("دفع", "مدني"),
    ("دفوع", "جنائي"),
    ("دفع", "جنائي"),
    ("مواعيد", "قانوني"),
    ("قواعد", "مواريث"),
    ("قيود", "جنايات"),
    ("قيود", "جنح"),
    ("قيود", "مخالف"),
    ("اوصاف", "جنح"),
    ("حيثيات", "مدني"),
    ("حيثيات", "جنائي"),
    ("فتاوى", "مجلس"),
    ("احكام", "نقض"),
    ("دستوريه", "عليا"),
    ("منشورات", "عقاري"),
]

_SPECIFIC_TYPES = {
    "defense_issue",
    "criminal_classification",
    "legal_deadline",
    "procedural_issue",
    "reasoning_template",
    "inheritance_issue",
    "real_estate_documentation",
    "family_issue",
    "labor_issue",
    "administrative_issue",
    "legal_dictionary",
}


def compute_confidence(title: str, node_type: str, level: Optional[int] = None) -> float:
    """حساب درجة الثقة في التصنيف وفق القواعد التقريبية."""
    norm = normalize_arabic(title)

    if node_type == "encyclopedia_root":
        return 0.90
    if node_type == "encyclopedia_branch":
        return 0.90
    if node_type == "unknown" or not norm:
        return 0.50

    # 0.90: عنوان واضح ومباشر (جميع كلمات إحدى المجموعات متوافرة)
    for tokens in _CLEAR_TITLE_TOKEN_GROUPS:
        if all(_has(norm, tok) for tok in tokens):
            return 0.90

    # 0.75: نوع محدد من فرع واضح، لكن العنوان عام
    if node_type in _SPECIFIC_TYPES:
        return 0.75

    if node_type in {
        "legislation_category",
        "judgment_category",
        "prosecution_category",
        "civil_issue",
        "criminal_issue",
    }:
        return 0.60

    return 0.50


# --------------------------------------------------------------------------- #
# بناء سجل العقدة
# --------------------------------------------------------------------------- #

def build_node_record(
    *,
    title: str,
    level: int,
    branch: str,
    parent_title: str,
    source_url: str,
    selector: str,
    text_snippet: str = "",
) -> "OrderedDict[str, Any]":
    """بناء سجل عقدة كامل وفق مخطط الإخراج المطلوب."""
    node_type = classify_node_type(title, branch=branch, level=level)
    normalized = normalize_arabic(title)
    saudi_domain = suggest_saudi_domain(title, branch=branch, node_type=node_type)
    issue_path = build_issue_path(branch, title)
    confidence = compute_confidence(title, node_type, level=level)

    record: "OrderedDict[str, Any]" = OrderedDict()
    record["source"] = SOURCE_NAME
    record["source_url"] = source_url
    record["jurisdiction"] = JURISDICTION
    record["level"] = level
    record["parent_title"] = parent_title
    record["node_title"] = title
    record["normalized_title"] = normalized
    record["node_type"] = node_type
    record["branch"] = branch
    record["suggested_saudi_domain"] = saudi_domain
    record["suggested_hakeem_issue_path"] = issue_path
    record["mapping_type"] = MAPPING_TYPE
    record["confidence"] = confidence
    record["needs_human_review"] = True  # (9) دائمًا true في المرحلة الأولى
    record["evidence"] = OrderedDict(
        [
            ("url", source_url),
            ("selector", selector),
            ("text_snippet", (text_snippet or title)[:280]),
        ]
    )
    return record


def validate_record(record: Dict[str, Any]) -> List[str]:
    """التحقق من مطابقة السجل لمخطط الإخراج. تُعيد قائمة بالأخطاء (فارغة إذا صحّ)."""
    errors: List[str] = []
    required = [
        "source",
        "source_url",
        "jurisdiction",
        "level",
        "parent_title",
        "node_title",
        "normalized_title",
        "node_type",
        "branch",
        "suggested_saudi_domain",
        "suggested_hakeem_issue_path",
        "mapping_type",
        "confidence",
        "needs_human_review",
        "evidence",
    ]
    for key in required:
        if key not in record:
            errors.append(f"missing field: {key}")

    if record.get("node_type") not in NODE_TYPES:
        errors.append(f"invalid node_type: {record.get('node_type')}")
    if record.get("jurisdiction") != JURISDICTION:
        errors.append("jurisdiction must be 'EG'")
    if record.get("mapping_type") != MAPPING_TYPE:
        errors.append("mapping_type must be 'structural_seed'")
    if not isinstance(record.get("level"), int):
        errors.append("level must be int")
    conf = record.get("confidence")
    if not isinstance(conf, (int, float)) or not (0.0 <= float(conf) <= 1.0):
        errors.append("confidence must be a float in [0,1]")
    if record.get("needs_human_review") is not True:
        errors.append("needs_human_review must be True in phase one")
    ev = record.get("evidence")
    if not isinstance(ev, dict) or not {"url", "selector", "text_snippet"} <= set(ev):
        errors.append("evidence must contain url/selector/text_snippet")
    return errors


# --------------------------------------------------------------------------- #
# 4) البنية البذرية (Structural Seed) للموسوعة القانونية المصرية
# --------------------------------------------------------------------------- #
#
# بنية عامة معروفة علنًا للموسوعة المصرية، تُستخدم كبذرة هيكلية مضمونة
# حتى لو تعذّر الوصول للشبكة. كل عنصر: (عنوان، [أبناء]).
# المستويات: 0 الجذر، 1 الفرع، 2 القسم، 3 المسألة، 4 الصياغات/المرادفات.

SEED_TREE: Dict[str, Any] = {
    "title": "الموسوعة القانونية المصرية",
    "children": [
        {
            "title": "موسوعة التشريعات",
            "children": [
                {"title": "القانون المدني"},
                {"title": "قانون العقوبات"},
                {"title": "قانون المرافعات المدنية والتجارية"},
                {"title": "قانون الإجراءات الجنائية"},
                {"title": "قانون الأحوال الشخصية"},
                {"title": "قانون العمل"},
                {"title": "اللوائح والقرارات الجمهورية"},
            ],
        },
        {
            "title": "موسوعة الأحكام",
            "url": "https://w.emj-eg.com/",
            "children": [
                {
                    "title": "أحكام النقض المدني",
                    "url": "https://w.emj-eg.com/AhkamT/Index?id=1",
                    "children": [
                        {"title": "مبادئ النقض المدني"},
                        {"title": "نماذج أحكام مدنية"},
                    ],
                },
                {
                    "title": "أحكام النقض الجنائي",
                    "url": "https://w.emj-eg.com/AhkamT/Index?id=2",
                    "children": [
                        {"title": "مبادئ النقض الجنائي"},
                        {"title": "نماذج أحكام جنائية"},
                    ],
                },
                {
                    "title": "أحكام الدستورية العليا",
                    "url": "https://w.emj-eg.com/AhkamT/Index?id=4",
                },
                {
                    "title": "المحكمة الإدارية العليا",
                    "url": "https://w.emj-eg.com/AhkamT/Index?id=6",
                },
                {
                    "title": "محكمة القضاء الإداري",
                    "url": "https://w.emj-eg.com/AhkamT/Index?id=7",
                },
                {"title": "فتاوى مجلس الدولة"},
                {
                    "title": "الحيثيات",
                    "children": [
                        {"title": "حيثيات مدنية"},
                        {"title": "حيثيات جنائية"},
                        {"title": "حيثيات الأسرة"},
                        {"title": "حيثيات العمل"},
                    ],
                },
                {
                    "title": "نماذج الأحكام",
                    "children": [
                        {"title": "صيغ ونماذج الأحكام المدنية"},
                        {"title": "صيغ ونماذج الأحكام الجنائية"},
                    ],
                },
            ],
        },
        {
            "title": "موسوعة النيابة",
            "children": [
                {
                    "title": "القيود والأوصاف",
                    "children": [
                        {"title": "قيود وأوصاف الجنايات"},
                        {"title": "قيود وأوصاف الجنح"},
                        {"title": "قيود وأوصاف المخالفات"},
                    ],
                },
                {"title": "التصرف في التحقيق"},
                {"title": "أوامر النيابة"},
            ],
        },
        {
            "title": "الموسوعة الجنائية",
            "children": [
                {
                    "title": "الدفوع الجنائية",
                    "children": [
                        {"title": "الدفع بالبطلان"},
                        {"title": "الدفع بانتفاء الركن المادي"},
                        {"title": "الدفع بانتفاء القصد الجنائي"},
                    ],
                },
                {
                    "title": "البطلان والمواعيد",
                    "children": [
                        {"title": "بطلان إجراءات الاستدلال"},
                        {"title": "المواعيد القانونية للطعن"},
                    ],
                },
                {"title": "التكييف الجنائي وقيود الاتهام"},
            ],
        },
        {
            "title": "الموسوعة المدنية",
            "children": [
                {
                    "title": "الدفوع المدنية",
                    "children": [
                        {"title": "الدفع بعدم القبول"},
                        {"title": "الدفع بعدم الاختصاص"},
                        {"title": "الدفع بالتقادم"},
                    ],
                },
                {
                    "title": "البطلان والمواعيد المدنية",
                    "children": [
                        {"title": "بطلان صحيفة الدعوى"},
                        {"title": "مواعيد الطعن المدني"},
                    ],
                },
                {"title": "قواعد المواريث"},
                {"title": "منشورات الشهر العقاري"},
            ],
        },
        {
            "title": "القاموس القانوني",
            "children": [
                {"title": "المصطلحات القانونية"},
                {"title": "المكنز القانوني"},
            ],
        },
    ],
}


def iter_seed_records(
    node: Dict[str, Any],
    *,
    level: int = 0,
    parent_title: str = "",
    branch: str = "",
    source_url: str = "seed://egypt_moj_structural_seed",
) -> Iterable[Tuple["OrderedDict[str, Any]", Dict[str, Any]]]:
    """مرور تكراري على البذرة، يُنتج (سجل مسطّح، عقدة الشجرة) لكل عنصر.

    إن حملت العقدة مفتاح "url" (رابط عام متحقَّق منه) فيُستخدم كـ source_url
    ودليل أقوى (selector = "public_index")؛ وإلا فهي بذرة هيكلية (selector = "seed").
    الأبناء يرثون أقرب رابط متحقَّق من أسلافهم ما لم يحملوا رابطًا خاصًا بهم.
    """
    title = node["title"]
    current_branch = title if level == 1 else branch
    node_url = node.get("url", source_url)
    selector = "public_index" if node.get("url") else "seed"

    record = build_node_record(
        title=title,
        level=level,
        branch=current_branch if level >= 1 else "",
        parent_title=parent_title,
        source_url=node_url,
        selector=selector,
        text_snippet=title,
    )
    yield record, node

    for child in node.get("children", []):
        yield from iter_seed_records(
            child,
            level=level + 1,
            parent_title=title,
            branch=current_branch,
            source_url=node_url,
        )


# --------------------------------------------------------------------------- #
# 2) مُحلّل HTML لاستخراج البنية العامة
# --------------------------------------------------------------------------- #

class StructureParser(HTMLParser):
    """مُحلّل خفيف يستخرج العناوين والقوائم والروابط و breadcrumbs من صفحة عامة."""

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.title: str = ""
        self.headings: List[Tuple[str, str]] = []  # (tag, text)
        self.list_items: List[str] = []
        self.links: List[Tuple[str, str]] = []  # (href, text)
        self.breadcrumbs: List[str] = []

        self._capture_stack: List[str] = []
        self._buf: List[str] = []
        self._in_title = False
        self._current_href: Optional[str] = None
        self._in_breadcrumb_depth = 0

    # --- helpers ---
    def _start_capture(self, tag: str) -> None:
        self._capture_stack.append(tag)
        self._buf = []

    def _flush(self) -> str:
        return _MULTISPACE.sub(" ", "".join(self._buf)).strip()

    def handle_starttag(self, tag: str, attrs: List[Tuple[str, Optional[str]]]) -> None:
        attr = dict(attrs)
        cls = (attr.get("class") or "") + " " + (attr.get("id") or "")
        if "breadcrumb" in cls.lower():
            self._in_breadcrumb_depth += 1

        if tag == "title":
            self._in_title = True
            self._buf = []
        elif tag in ("h1", "h2", "h3"):
            self._start_capture(tag)
        elif tag == "li":
            self._start_capture("li")
        elif tag == "a":
            self._current_href = attr.get("href")
            self._start_capture("a")

    def handle_endtag(self, tag: str) -> None:
        if tag == "title" and self._in_title:
            self.title = self._flush()
            self._in_title = False
            return

        if self._capture_stack and self._capture_stack[-1] == tag:
            text = self._flush()
            self._capture_stack.pop()
            if tag in ("h1", "h2", "h3") and text:
                self.headings.append((tag, text))
            elif tag == "li" and text:
                self.list_items.append(text)
                if self._in_breadcrumb_depth > 0:
                    self.breadcrumbs.append(text)
            elif tag == "a":
                if text or self._current_href:
                    self.links.append((self._current_href or "", text))
                self._current_href = None

        if tag != "title":
            # إغلاق breadcrumb (تقريبي)
            if self._in_breadcrumb_depth > 0 and tag in ("nav", "ol", "ul", "div"):
                self._in_breadcrumb_depth = max(0, self._in_breadcrumb_depth - 1)

    def handle_data(self, data: str) -> None:
        if self._in_title or self._capture_stack:
            self._buf.append(data)


# --------------------------------------------------------------------------- #
# 1) Crawler آمن ومهذّب
# --------------------------------------------------------------------------- #

class SafeCrawler:
    """زاحف مهذّب يحترم robots.txt والأنماط المحظورة وحدود الصفحات."""

    def __init__(
        self,
        *,
        allowed_domains: List[str],
        blocked_patterns: List[str],
        max_pages: int,
        delay: float,
        timeout: float,
        respect_robots: bool = True,
        max_retries: int = 3,
        max_depth: int = 3,
        use_sitemap: bool = True,
    ) -> None:
        self.allowed_domains = [d.lower() for d in allowed_domains]
        self.blocked_patterns = [p.lower() for p in blocked_patterns]
        self.max_pages = max_pages
        self.delay = delay
        self.timeout = timeout
        self.respect_robots = respect_robots
        self.max_retries = max_retries
        self.max_depth = max_depth
        self.use_sitemap = use_sitemap

        self.visited: List[str] = []
        self.skipped: List[Tuple[str, str]] = []  # (url, reason)
        self.errors: List[Tuple[str, str]] = []  # (url, error)
        self.json_records: List["OrderedDict[str, Any]"] = []  # عقد من واجهات JSON
        self.sitemaps_seen: List[str] = []
        self._robots_cache: Dict[str, Optional[robotparser.RobotFileParser]] = {}

    # --- فلترة الروابط ---
    def is_blocked(self, url: str) -> bool:
        low = url.lower()
        return any(pat in low for pat in self.blocked_patterns)

    def is_allowed_domain(self, url: str) -> bool:
        host = (urlparse(url).hostname or "").lower()
        if not self.allowed_domains:
            return True
        return any(host == d or host.endswith("." + d) for d in self.allowed_domains)

    def _robots(self, url: str) -> Optional[robotparser.RobotFileParser]:
        if not self.respect_robots:
            return None
        parsed = urlparse(url)
        base = f"{parsed.scheme}://{parsed.netloc}"
        if base in self._robots_cache:
            return self._robots_cache[base]
        rp = robotparser.RobotFileParser()
        rp.set_url(urljoin(base, "/robots.txt"))
        try:
            rp.read()
        except Exception as exc:  # pragma: no cover - شبكي
            logger.warning("تعذّر قراءة robots.txt من %s: %s", base, exc)
            rp = None
        self._robots_cache[base] = rp
        return rp

    def robots_allows(self, url: str) -> bool:
        rp = self._robots(url)
        if rp is None:
            return True
        try:
            return rp.can_fetch(USER_AGENT, url)
        except Exception:
            return True

    # --- جلب صفحة مع retry/backoff ---
    def fetch(self, url: str) -> Tuple[Optional[str], str]:
        """تُعيد (المحتوى، النوع) حيث النوع أحد: html / xml / json / "".

        تدعم HTML (الفهارس العامة) وXML (sitemap) وJSON (واجهات serviceapi العامة).
        """
        backoff = 2.0
        for attempt in range(1, self.max_retries + 1):
            try:
                req = Request(
                    url,
                    headers={
                        "User-Agent": USER_AGENT,
                        "Accept": "text/html,application/xhtml+xml,application/xml,application/json;q=0.9,*/*;q=0.8",
                        "Accept-Language": "ar,en;q=0.8",
                    },
                )
                with urlopen(req, timeout=self.timeout) as resp:
                    ctype = (resp.headers.get("Content-Type", "") or "").lower()
                    charset = resp.headers.get_content_charset() or "utf-8"
                    raw = resp.read(4_000_000)  # حد أعلى لطيف ~4MB
                    text = raw.decode(charset, errors="replace")
                    if "json" in ctype or (not ctype and text.lstrip()[:1] in "[{"):
                        kind = "json"
                    elif "xml" in ctype or url.lower().endswith(".xml"):
                        kind = "xml"
                    elif "html" in ctype or not ctype:
                        kind = "html"
                    else:
                        logger.info("تخطّي محتوى غير مدعوم (%s) في %s", ctype, url)
                        return None, ""
                    return text, kind
            except HTTPError as exc:
                # أخطاء العميل (4xx) لا تُعاد المحاولة فيها
                if 400 <= exc.code < 500 and exc.code not in (408, 429):
                    self.errors.append((url, f"HTTP {exc.code}"))
                    logger.warning("HTTP %s في %s — لا إعادة محاولة", exc.code, url)
                    return None, ""
                logger.warning(
                    "HTTP %s في %s (محاولة %d/%d)", exc.code, url, attempt, self.max_retries
                )
            except (URLError, socket.timeout, TimeoutError) as exc:
                # أخطاء DNS / مهلة — إعادة المحاولة مع backoff
                logger.warning(
                    "خطأ شبكي (%s) في %s (محاولة %d/%d)",
                    getattr(exc, "reason", exc), url, attempt, self.max_retries,
                )
            except Exception as exc:  # pragma: no cover
                self.errors.append((url, f"{type(exc).__name__}: {exc}"))
                logger.warning("خطأ غير متوقّع في %s: %s", url, exc)
                return None, ""

            if attempt < self.max_retries:
                time.sleep(backoff)
                backoff *= 2
        self.errors.append((url, "exhausted retries"))
        return None, ""

    # --- اكتشاف خرائط الموقع (sitemap) ---
    def discover_sitemaps(self, base_url: str) -> List[str]:
        """جمع روابط sitemap من توجيه robots.txt ومن /sitemap.xml الافتراضي."""
        parsed = urlparse(base_url)
        base = f"{parsed.scheme}://{parsed.netloc}"
        candidates: List[str] = []
        rp = self._robots(base + "/")
        if rp is not None:
            try:
                sm = rp.site_maps()
                if sm:
                    candidates.extend(sm)
            except Exception:
                pass
        candidates.append(urljoin(base, "/sitemap.xml"))
        # إزالة التكرار مع الحفاظ على الترتيب
        return list(dict.fromkeys(candidates))

    @staticmethod
    def parse_sitemap_xml(text: str) -> List[str]:
        """استخراج كل <loc>...</loc> من ملف sitemap أو فهرس sitemaps."""
        return [m.strip() for m in re.findall(r"<loc>\s*(.*?)\s*</loc>", text, re.I | re.S)]

    def crawl(self, start_urls: List[str]) -> List[Dict[str, Any]]:
        """زحف عرضي محدود (BFS) مع عمق ودعم sitemap وJSON.

        يُعيد قائمة بنتائج تحليل صفحات HTML؛ وتُجمع عقد JSON في self.json_records.
        """
        results: List[Dict[str, Any]] = []
        # عناصر الطابور: (url, depth)
        queue: List[Tuple[str, int]] = [(u, 0) for u in dict.fromkeys(start_urls)]
        seen = {u for u, _ in queue}

        # بذر خرائط الموقع (sitemap) لرفع التغطية للصفحات العامة
        if self.use_sitemap:
            for u in list(dict.fromkeys(start_urls)):
                for sm in self.discover_sitemaps(u):
                    if sm not in seen and self.is_allowed_domain(sm) and not self.is_blocked(sm):
                        seen.add(sm)
                        self.sitemaps_seen.append(sm)
                        queue.append((sm, 0))

        while queue and len(self.visited) < self.max_pages:
            url, depth = queue.pop(0)

            if self.is_blocked(url):
                self.skipped.append((url, "blocked_pattern"))
                continue
            if not self.is_allowed_domain(url):
                self.skipped.append((url, "out_of_domain"))
                continue
            if not self.robots_allows(url):
                self.skipped.append((url, "robots_disallow"))
                continue

            logger.info(
                "زيارة (%d/%d) [عمق %d]: %s",
                len(self.visited) + 1, self.max_pages, depth, url,
            )
            text, kind = self.fetch(url)
            self.visited.append(url)

            if not text:
                if self.delay:
                    time.sleep(self.delay)
                continue

            if kind == "json":
                # واجهة JSON عامة (مثل serviceapi) — استخراج العقد منها مباشرة
                try:
                    payload = json.loads(text)
                    recs = json_to_records(payload, url)
                    self.json_records.extend(recs)
                    logger.info("استخرجت %d عقدة من JSON: %s", len(recs), url)
                except Exception as exc:
                    self.errors.append((url, f"json parse error: {exc}"))

            elif kind == "xml":
                # sitemap أو فهرس sitemaps — تتبّع روابطه
                for loc in self.parse_sitemap_xml(text):
                    nxt = loc.split("#")[0]
                    if not nxt.startswith("http") or nxt in seen:
                        continue
                    if self.is_blocked(nxt) or not self.is_allowed_domain(nxt):
                        continue
                    seen.add(nxt)
                    queue.append((nxt, depth))  # روابط sitemap بنفس العمق

            else:  # html
                parser = StructureParser()
                try:
                    parser.feed(text)
                except Exception as exc:  # pragma: no cover
                    self.errors.append((url, f"parse error: {exc}"))
                    if self.delay:
                        time.sleep(self.delay)
                    continue

                results.append(
                    {
                        "url": url,
                        "title": parser.title,
                        "headings": parser.headings,
                        "list_items": parser.list_items,
                        "links": parser.links,
                        "breadcrumbs": parser.breadcrumbs,
                    }
                )

                # تتبّع الروابط الداخلية حتى max_depth (مع pagination عبر روابط <a>)
                if depth < self.max_depth:
                    for href, _txt in parser.links:
                        if not href:
                            continue
                        nxt = urljoin(url, href.split("#")[0])
                        if not nxt.startswith("http") or nxt in seen:
                            continue
                        if self.is_blocked(nxt) or not self.is_allowed_domain(nxt):
                            continue
                        seen.add(nxt)
                        queue.append((nxt, depth + 1))

            if self.delay:
                time.sleep(self.delay)

        return results


# --------------------------------------------------------------------------- #
# دمج نتائج الزحف في عقد مرشّحة
# --------------------------------------------------------------------------- #

_LEGAL_HINT = re.compile(
    "|".join(
        [
            "دفع", "دفوع", "حيثي", "ميعاد", "مواعيد", "بطلان", "قيد", "قيود",
            "وصف", "اوصاف", "تكييف", "ميراث", "مواريث", "تركه", "شهر عقاري",
            "فتوى", "فتاوى", "اداري", "نقض", "دستوري", "تشريع", "قانون", "نيابه",
            "احكام", "مصطلح", "قاموس", "اسره", "احوال", "عمل",
        ]
    )
)


def crawl_results_to_records(
    results: List[Dict[str, Any]],
) -> List["OrderedDict[str, Any]"]:
    """تحويل نتائج الزحف العامة إلى عقد مرشّحة (Level 3 تقريبًا)."""
    records: List["OrderedDict[str, Any]"] = []
    seen_titles = set()

    for page in results:
        page_title = page.get("title", "")
        branch = ""
        crumbs = page.get("breadcrumbs") or []
        if crumbs:
            branch = crumbs[0]

        candidates: List[Tuple[str, str, str]] = []  # (title, selector, snippet)
        for tag, text in page.get("headings", []):
            candidates.append((text, tag, text))
        for item in page.get("list_items", []):
            candidates.append((item, "menu", item))
        for href, text in page.get("links", []):
            if text:
                candidates.append((text, "link", text))

        for title, selector, snippet in candidates:
            norm = normalize_arabic(title)
            if not norm or len(norm) < 3:
                continue
            if not _LEGAL_HINT.search(norm):
                continue
            key = (norm, page.get("url"))
            if key in seen_titles:
                continue
            seen_titles.add(key)
            records.append(
                build_node_record(
                    title=title.strip(),
                    level=3,
                    branch=branch or page_title,
                    parent_title=page_title or branch,
                    source_url=page.get("url", ""),
                    selector=selector,
                    text_snippet=snippet,
                )
            )
    return records


# مفاتيح JSON الشائعة التي تحمل عناوين/تصنيفات قابلة للاستخراج
_JSON_TITLE_KEYS = {
    "title", "name", "label", "text", "caption", "heading", "category",
    "section", "subject", "node", "term", "arabic", "ar", "name_ar",
    "title_ar", "value", "displayname", "display_name",
}
_JSON_CHILD_KEYS = {
    "children", "items", "nodes", "subcategories", "sub", "data", "result",
    "results", "list", "categories", "sections", "branches", "content",
}


def json_to_records(
    payload: Any,
    url: str,
    *,
    parent_title: str = "",
    branch: str = "",
    _depth: int = 0,
) -> List["OrderedDict[str, Any]"]:
    """استخراج عقد قانونية مرشّحة من حمولة JSON عامة (مثل واجهات serviceapi).

    يمشي على الشجرة بشكل تكراري، يلتقط القيم النصية تحت مفاتيح العناوين
    المعروفة، ويصفّيها بمؤشّر قانوني، ثم يبني سجلات بنفس المخطط.
    """
    records: List["OrderedDict[str, Any]"] = []
    if _depth > 8:
        return records

    if isinstance(payload, dict):
        local_title = ""
        for key in _JSON_TITLE_KEYS:
            val = payload.get(key)
            if isinstance(val, str) and val.strip():
                local_title = val.strip()
                break

        if local_title:
            norm = normalize_arabic(local_title)
            if len(norm) >= 3 and _LEGAL_HINT.search(norm):
                records.append(
                    build_node_record(
                        title=local_title,
                        level=3,
                        branch=branch or parent_title,
                        parent_title=parent_title,
                        source_url=url,
                        selector="json",
                        text_snippet=local_title,
                    )
                )

        next_parent = local_title or parent_title
        next_branch = branch or local_title
        for _key, val in payload.items():
            if isinstance(val, (dict, list)):
                records.extend(
                    json_to_records(
                        val, url,
                        parent_title=next_parent, branch=next_branch,
                        _depth=_depth + 1,
                    )
                )

    elif isinstance(payload, list):
        for item in payload:
            records.extend(
                json_to_records(
                    item, url,
                    parent_title=parent_title, branch=branch,
                    _depth=_depth + 1,
                )
            )

    # إزالة التكرار حسب (normalized_title)
    deduped: "OrderedDict[str, OrderedDict[str, Any]]" = OrderedDict()
    for r in records:
        deduped.setdefault(r["normalized_title"], r)
    return list(deduped.values())


# --------------------------------------------------------------------------- #
# استيعاب ملفات محفوظة محليًا (offline) — مسار "النتيجة القوية" بلا شبكة
# --------------------------------------------------------------------------- #

def ingest_local(input_dir: str) -> List["OrderedDict[str, Any]"]:
    """استخراج عقد من صفحات HTML/JSON محفوظة محليًا (وصول مشروع، بلا شبكة).

    يقرأ كل ملفات *.html / *.htm / *.json داخل المجلد (تتبّعًا تكراريًا).
    إن وُجد ملف مرافق بنفس الاسم بامتداد .url فيُستخدم محتواه كـ source_url.
    """
    root = Path(input_dir)
    records: List["OrderedDict[str, Any]"] = []
    if not root.exists():
        logger.warning("مجلد الإدخال غير موجود: %s", input_dir)
        return records

    files = sorted(
        list(root.rglob("*.html"))
        + list(root.rglob("*.htm"))
        + list(root.rglob("*.json"))
    )
    for fp in files:
        url_file = fp.with_suffix(".url")
        source_url = (
            url_file.read_text(encoding="utf-8").strip()
            if url_file.exists()
            else f"file://{fp.resolve()}"
        )
        try:
            text = fp.read_text(encoding="utf-8", errors="replace")
        except Exception as exc:
            logger.warning("تعذّر قراءة %s: %s", fp, exc)
            continue

        if fp.suffix.lower() == ".json":
            try:
                records.extend(json_to_records(json.loads(text), source_url))
            except Exception as exc:
                logger.warning("JSON غير صالح في %s: %s", fp, exc)
        else:
            parser = StructureParser()
            try:
                parser.feed(text)
            except Exception as exc:
                logger.warning("تعذّر تحليل %s: %s", fp, exc)
                continue
            page = {
                "url": source_url,
                "title": parser.title,
                "headings": parser.headings,
                "list_items": parser.list_items,
                "links": parser.links,
                "breadcrumbs": parser.breadcrumbs,
            }
            records.extend(crawl_results_to_records([page]))

    logger.info("استوعبت %d عقدة من %d ملف محلي.", len(records), len(files))
    return records


# --------------------------------------------------------------------------- #
# بناء الشجرة الهرمية مع حقول المواءمة
# --------------------------------------------------------------------------- #

def enrich_tree(
    node: Dict[str, Any],
    *,
    level: int = 0,
    parent_title: str = "",
    branch: str = "",
    source_url: str = "seed://egypt_moj_structural_seed",
) -> "OrderedDict[str, Any]":
    """تحويل بذرة الشجرة إلى شجرة مُثراة بكل حقول المواءمة + الأبناء."""
    title = node["title"]
    current_branch = title if level == 1 else branch
    node_url = node.get("url", source_url)
    record = build_node_record(
        title=title,
        level=level,
        branch=current_branch if level >= 1 else "",
        parent_title=parent_title,
        source_url=node_url,
        selector="public_index" if node.get("url") else "seed",
        text_snippet=title,
    )
    out: "OrderedDict[str, Any]" = OrderedDict()
    out["node_title"] = title
    out["normalized_title"] = record["normalized_title"]
    out["level"] = level
    out["node_type"] = record["node_type"]
    out["branch"] = record["branch"]
    out["source_url"] = node_url
    out["suggested_saudi_domain"] = record["suggested_saudi_domain"]
    out["suggested_hakeem_issue_path"] = record["suggested_hakeem_issue_path"]
    out["confidence"] = record["confidence"]
    out["needs_human_review"] = record["needs_human_review"]
    out["children"] = [
        enrich_tree(
            child, level=level + 1, parent_title=title, branch=current_branch,
            source_url=node_url,
        )
        for child in node.get("children", [])
    ]
    return out


# --------------------------------------------------------------------------- #
# كتابة المخرجات
# --------------------------------------------------------------------------- #

def write_jsonl(path: Path, records: List[Dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as fh:
        for rec in records:
            fh.write(json.dumps(rec, ensure_ascii=False) + "\n")


def write_tree(path: Path, tree: Dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as fh:
        json.dump(tree, fh, ensure_ascii=False, indent=2)


def write_csv(path: Path, records: List[Dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    columns = [
        "source", "source_url", "jurisdiction", "level", "parent_title",
        "node_title", "normalized_title", "node_type", "branch",
        "suggested_saudi_domain", "suggested_hakeem_issue_path", "mapping_type",
        "confidence", "needs_human_review", "evidence_url", "evidence_selector",
        "evidence_snippet",
    ]
    with path.open("w", encoding="utf-8", newline="") as fh:
        writer = csv.DictWriter(fh, fieldnames=columns)
        writer.writeheader()
        for rec in records:
            ev = rec.get("evidence", {})
            row = {k: rec.get(k) for k in columns if k in rec}
            row["evidence_url"] = ev.get("url", "")
            row["evidence_selector"] = ev.get("selector", "")
            row["evidence_snippet"] = ev.get("text_snippet", "")
            writer.writerow(row)


def write_sample(path: Path, records: List[Dict[str, Any]], n: int = 20) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as fh:
        for rec in records[:n]:
            fh.write(json.dumps(rec, ensure_ascii=False) + "\n")


def write_log(path: Path, log: Dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as fh:
        json.dump(log, fh, ensure_ascii=False, indent=2)


def write_report(
    path: Path,
    *,
    crawler: SafeCrawler,
    records: List[Dict[str, Any]],
    start_urls: List[str],
    validation_errors: int,
) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    by_type = Counter(r["node_type"] for r in records)
    by_branch = Counter(r["branch"] for r in records if r.get("branch"))

    lines: List[str] = []
    lines.append("# تقرير استخراج شجرة المسائل القانونية — الموسوعة القانونية المصرية\n")
    lines.append(f"- التاريخ: {time.strftime('%Y-%m-%d %H:%M:%S')}")
    lines.append(f"- المصدر: {SOURCE_NAME} ({JURISDICTION})")
    lines.append(f"- روابط البداية: {', '.join(start_urls)}")
    lines.append("")
    lines.append("## ملخص التشغيل")
    lines.append(f"- عدد الصفحات التي تمت زيارتها: **{len(crawler.visited)}**")
    lines.append(f"- عدد الروابط التي تم تجاهلها: **{len(crawler.skipped)}**")
    lines.append(f"- عدد العقد المستخرجة: **{len(records)}**")
    lines.append(f"- عدد أخطاء التحقق من المخطط (schema): **{validation_errors}**")
    lines.append("")
    lines.append("## عدد العقد حسب node_type")
    for ntype, count in by_type.most_common():
        lines.append(f"- `{ntype}`: {count}")
    lines.append("")
    lines.append("## أكثر الفروع إنتاجًا")
    for branch, count in by_branch.most_common(10):
        lines.append(f"- {branch}: {count}")
    lines.append("")
    lines.append("## الروابط المتجاهَلة (عينة)")
    if crawler.skipped:
        for url, reason in crawler.skipped[:20]:
            lines.append(f"- `{reason}` — {url}")
    else:
        lines.append("- لا يوجد.")
    lines.append("")
    lines.append("## الأخطاء")
    if crawler.errors:
        for url, err in crawler.errors[:30]:
            lines.append(f"- {url} — {err}")
    else:
        lines.append("- لا توجد أخطاء مسجّلة.")
    lines.append("")
    lines.append("## تنبيه مهم")
    lines.append(
        "> هذه النتائج **بذرة هيكلية (structural seed)** مستخرجة من بنية الموسوعة "
        "القانونية المصرية، وهي **ليست قانونًا سعوديًا معتمدًا**. كل عقدة تحمل "
        "`needs_human_review = true` وتتطلب مواءمة سعودية بشرية قبل اعتمادها في "
        "Hakeem Legal Issues Core."
    )
    lines.append("")
    path.write_text("\n".join(lines), encoding="utf-8")


# --------------------------------------------------------------------------- #
# نقطة التشغيل
# --------------------------------------------------------------------------- #

def load_config(path: str) -> Dict[str, Any]:
    p = Path(path)
    if p.exists():
        with p.open(encoding="utf-8") as fh:
            return json.load(fh)
    logger.warning("ملف الإعدادات غير موجود (%s) — استخدام القيم الافتراضية", path)
    return {
        "start_urls": ["https://w.emj-eg.com/", "https://serviceapi.egyptianlaws.com/"],
        "blocked_patterns": DEFAULT_BLOCKED_PATTERNS,
        "allowed_domains": ["w.emj-eg.com", "serviceapi.egyptianlaws.com"],
    }


def build_arg_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        description="Egyptian Legal Encyclopedia Issue Tree Extractor",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    p.add_argument("--max-pages", type=int, default=5, help="أقصى عدد صفحات للزيارة")
    p.add_argument("--delay", type=float, default=2.0, help="تأخير بين الطلبات (ثوانٍ)")
    p.add_argument("--timeout", type=float, default=20.0, help="مهلة الطلب (ثوانٍ)")
    p.add_argument("--config", default=DEFAULT_CONFIG, help="ملف مصادر JSON")
    p.add_argument("--out-jsonl", default=DEFAULT_OUT_JSONL, help="ملف JSONL المسطّح")
    p.add_argument("--out-tree", default=DEFAULT_OUT_TREE, help="ملف الشجرة الهرمية")
    p.add_argument("--out-csv", default=DEFAULT_OUT_CSV, help="ملف CSV (اختياري)")
    p.add_argument("--out-sample", default=DEFAULT_OUT_SAMPLE, help="ملف العينة")
    p.add_argument("--out-report", default=DEFAULT_OUT_REPORT, help="تقرير التشغيل (md)")
    p.add_argument("--log", default=DEFAULT_LOG, help="ملف سجل التشغيل JSON")
    p.add_argument("--max-depth", type=int, default=3, help="أقصى عمق للزحف الداخلي")
    p.add_argument(
        "--input-dir",
        default=None,
        help="مجلد ملفات HTML/JSON محفوظة محليًا للاستخراج offline (بلا شبكة)",
    )
    p.add_argument(
        "--no-network",
        action="store_true",
        help="عدم محاولة الزحف الشبكي والاكتفاء بالبذرة الهيكلية/الملفات المحلية",
    )
    p.add_argument(
        "--no-sitemap",
        action="store_true",
        help="عدم اكتشاف sitemap.xml أثناء الزحف",
    )
    p.add_argument(
        "--no-seed",
        action="store_true",
        help="عدم تضمين البذرة الهيكلية (الاكتفاء بالزحف/الملفات المحلية)",
    )
    p.add_argument(
        "--no-robots",
        action="store_true",
        help="عدم محاولة قراءة robots.txt (غير مستحسن)",
    )
    p.add_argument(
        "--no-csv", action="store_true", help="عدم كتابة ملف CSV"
    )
    return p


def main(argv: Optional[List[str]] = None) -> int:
    args = build_arg_parser().parse_args(argv)

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(message)s",
    )

    config = load_config(args.config)
    start_urls = config.get("start_urls", [])
    blocked = config.get("blocked_patterns", DEFAULT_BLOCKED_PATTERNS)
    allowed = config.get("allowed_domains", [])

    started_at = time.time()

    # ---- (4) البذرة الهيكلية المضمونة ----
    seed_records: List["OrderedDict[str, Any]"] = []
    if not args.no_seed:
        seed_records = [rec for rec, _node in iter_seed_records(SEED_TREE)]
        logger.info("تم توليد %d عقدة من البذرة الهيكلية.", len(seed_records))

    # ---- (ب) استيعاب الملفات المحلية offline (إن طُلب) ----
    local_records: List["OrderedDict[str, Any]"] = []
    if args.input_dir:
        logger.info("استيعاب الملفات المحلية من: %s", args.input_dir)
        local_records = ingest_local(args.input_dir)

    # ---- (1) الزحف الآمن المُحسّن (sitemap + JSON + عمق) ----
    crawler = SafeCrawler(
        allowed_domains=allowed,
        blocked_patterns=blocked,
        max_pages=args.max_pages,
        delay=args.delay,
        timeout=args.timeout,
        respect_robots=not args.no_robots,
        max_depth=args.max_depth,
        use_sitemap=not args.no_sitemap,
    )
    crawl_records: List["OrderedDict[str, Any]"] = []
    if not args.no_network and start_urls:
        logger.info(
            "بدء الزحف المهذّب (حد أقصى %d صفحات، عمق %d، sitemap=%s)...",
            args.max_pages, args.max_depth, not args.no_sitemap,
        )
        try:
            results = crawler.crawl(start_urls)
            crawl_records = crawl_results_to_records(results)
            # دمج عقد JSON المستخرجة من واجهات serviceapi العامة
            crawl_records = list(crawl_records) + list(crawler.json_records)
            logger.info(
                "انتهى الزحف: %d صفحة زيارة، %d عقدة HTML + %d عقدة JSON.",
                len(crawler.visited), len(results), len(crawler.json_records),
            )
        except Exception as exc:  # pragma: no cover
            logger.error("فشل الزحف: %s — الاكتفاء بالبذرة/الملفات المحلية.", exc)
            crawler.errors.append(("<crawl>", str(exc)))
    else:
        logger.info("تم تخطّي الزحف الشبكي (--no-network أو لا توجد روابط).")

    # ---- دمج العقد ----
    all_records: List[Dict[str, Any]] = (
        list(seed_records) + list(local_records) + list(crawl_records)
    )

    # إزالة التكرار حسب (normalized_title, level, branch)
    deduped: "OrderedDict[Tuple[str, int, str], Dict[str, Any]]" = OrderedDict()
    for rec in all_records:
        key = (rec["normalized_title"], rec["level"], rec.get("branch", ""))
        if key not in deduped:
            deduped[key] = rec
    records = list(deduped.values())

    # ---- (5) التحقق من المخطط ----
    validation_errors = 0
    for rec in records:
        errs = validate_record(rec)
        if errs:
            validation_errors += len(errs)
            logger.warning("سجل غير مطابق (%s): %s", rec.get("node_title"), errs)

    # ---- (11) الشجرة الهرمية ----
    tree = enrich_tree(SEED_TREE)

    # ---- كتابة المخرجات ----
    write_jsonl(Path(args.out_jsonl), records)
    write_tree(Path(args.out_tree), tree)
    if not args.no_csv:
        write_csv(Path(args.out_csv), records)
    write_sample(Path(args.out_sample), records)
    write_report(
        Path(args.out_report),
        crawler=crawler,
        records=records,
        start_urls=start_urls,
        validation_errors=validation_errors,
    )

    elapsed = round(time.time() - started_at, 2)
    by_type = Counter(r["node_type"] for r in records)
    log = OrderedDict(
        [
            ("started_at", time.strftime("%Y-%m-%dT%H:%M:%S", time.localtime(started_at))),
            ("elapsed_seconds", elapsed),
            ("user_agent", USER_AGENT),
            ("start_urls", start_urls),
            ("max_pages", args.max_pages),
            ("delay", args.delay),
            ("timeout", args.timeout),
            ("network_attempted", (not args.no_network) and bool(start_urls)),
            ("max_depth", args.max_depth),
            ("input_dir", args.input_dir),
            ("sitemaps_seen", crawler.sitemaps_seen),
            ("pages_visited", crawler.visited),
            ("links_skipped", [{"url": u, "reason": r} for u, r in crawler.skipped]),
            ("errors", [{"url": u, "error": e} for u, e in crawler.errors]),
            ("seed_nodes", len(seed_records)),
            ("local_nodes", len(local_records)),
            ("crawl_html_nodes", len(crawl_records) - len(crawler.json_records)),
            ("crawl_json_nodes", len(crawler.json_records)),
            ("total_nodes", len(records)),
            ("nodes_by_type", dict(by_type)),
            ("schema_validation_errors", validation_errors),
        ]
    )
    write_log(Path(args.log), log)

    # ---- ملخص على الشاشة ----
    print("\n" + "=" * 60)
    print("ملخص الاستخراج (بذرة هيكلية مصرية — تحتاج مواءمة سعودية بشرية)")
    print("=" * 60)
    print(f"الصفحات التي تمت زيارتها : {len(crawler.visited)}")
    print(f"الروابط التي تم تجاهلها  : {len(crawler.skipped)}")
    print(f"عقد البذرة الهيكلية      : {len(seed_records)}")
    print(f"عقد من ملفات محلية       : {len(local_records)}")
    print(f"عقد من الزحف (HTML+JSON) : {len(crawl_records)}")
    print(f"إجمالي العقد            : {len(records)}")
    print(f"أخطاء مخطط schema        : {validation_errors}")
    print("\nالعقد حسب node_type:")
    for ntype, count in by_type.most_common():
        print(f"  - {ntype}: {count}")
    print("\nالمخرجات:")
    for label, p in [
        ("JSONL", args.out_jsonl),
        ("Tree", args.out_tree),
        ("CSV", args.out_csv if not args.no_csv else "(تم تخطّيه)"),
        ("Sample", args.out_sample),
        ("Report", args.out_report),
        ("Log", args.log),
    ]:
        print(f"  - {label}: {p}")
    print("\nتنبيه: النتائج بذرة هيكلية وليست قانونًا سعوديًا معتمدًا.")
    print("=" * 60)

    return 0


if __name__ == "__main__":
    sys.exit(main())
