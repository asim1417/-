#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Fiqh Issue Tree Generator — مولّد شجرة المسائل الفقهية.

يحصر المسائل الفقهية من **كتاب البيع حتى نهاية الموسوعة** (المعاملات فما بعدها:
المعاملات المالية، الأحوال الشخصية والأسرة، الجنايات والحدود، القضاء والإثبات)،
مستندًا إلى بنية الموسوعة الفقهية الكويتية والمتون الفقهية المعتمدة (المتاحة في
مكتبات مفتوحة: المكتبة الشاملة كتاب 11430، ketabonline 912، turath.io).

المنهج (كما طُلب):
  1. حصر المسائل من كتاب البيع إلى آخر الموسوعة.
  2. توليد تركيبي برمجي: قسم > كتاب > باب > مسألة (≥ 3000 مسألة).
  3. ربط كل مسألة بالمجال/النظام السعودي المقابل (مواءمة مبدئية).
  4. كل مسألة تحمل needs_human_review = true لمراجعة الصياغة سعوديًا قبل اعتمادها.

ملاحظة: هذه بذرة هيكلية فقهية (fiqh_seed) تُراجَع صياغتها بشريًا وتُربط
بالأنظمة السعودية في قاعدة البيانات؛ وليست فتوى ولا نظامًا سعوديًا معتمدًا.

يعتمد فقط على المكتبة القياسية + دالة التطبيع من مستخرج الموسوعة المصرية.
"""

from __future__ import annotations

import argparse
import csv
import json
import sys
from collections import Counter, OrderedDict
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

# إعادة استخدام دالة تطبيع النص العربي من المستخرج المصري
sys.path.insert(0, str(Path(__file__).resolve().parent))
from egypt_moj_issue_tree_extractor import normalize_arabic  # noqa: E402

SOURCE_NAME = "Kuwaiti Fiqh Encyclopedia (الموسوعة الفقهية الكويتية)"
JURISDICTION = "Fiqh"
MAPPING_TYPE = "fiqh_seed"

# مكتبات مفتوحة تحوي الموسوعة (للاستشهاد كأدلة فقط)
OPEN_SOURCES = {
    "shamela": "https://shamela.ws/book/11430",
    "ketabonline": "https://ketabonline.com/ar/books/912",
    "turath": "https://app.turath.io/book/11430",
}

# أنواع العقد
NODE_TYPES = {
    "fiqh_root", "fiqh_section", "fiqh_book", "fiqh_chapter",
    "transactions_issue",     # معاملات مالية مدنية
    "commercial_issue",       # معاملات تجارية
    "family_issue",           # أحوال شخصية وأسرة
    "inheritance_issue",      # مواريث ووصايا
    "criminal_hudud_issue",   # حدود
    "criminal_qisas_issue",   # قصاص وديات
    "criminal_tazir_issue",   # تعزير
    "procedural_issue",       # قضاء ومرافعات
    "evidence_issue",         # إثبات وبينات وشهادة وإقرار ويمين
    "general_fiqh_issue",     # أيمان ونذور وكفارات ونحوها
}

# أبعاد المسألة المطبّقة على كل باب (توليد تركيبي)
# كل عنصر: (مفتاح، قالب العنوان، نوع المسألة الخاص إن وُجد)
ISSUE_DIMENSIONS: List[Tuple[str, str, Optional[str]]] = [
    ("تعريف", "{ch}: التعريف والمفهوم", None),
    ("حكم", "{ch}: الحكم والمشروعية", None),
    ("اركان", "{ch}: الأركان", None),
    ("شروط", "{ch}: الشروط المعتبرة", None),
    ("انواع", "{ch}: الأنواع والأقسام", None),
    ("صور", "{ch}: الصور والتطبيقات", None),
    ("موانع", "{ch}: الموانع وما يبطله ويفسده", None),
    ("اثار", "{ch}: الآثار والأحكام المترتبة", None),
    ("ضمان", "{ch}: الضمان والمسؤولية", None),
    ("خيار", "{ch}: الخيار والفسخ والانفساخ", None),
    ("نزاع", "{ch}: النزاع وطرق الإثبات", "evidence_issue"),
    ("تكييف", "{ch}: التكييف النظامي السعودي", None),
    ("معاصر", "{ch}: التطبيقات والنوازل المعاصرة", None),
    ("خلاف", "{ch}: الخلاف الفقهي بين المذاهب الأربعة", None),
]

# أبعاد لا تناسب الأقسام غير المالية (تُحذف منها لتفادي تركيبات غير منطقية
# مثل «الخيار والفسخ» في الحدود أو «الضمان» في القضاء).
_LEAN_DROP = {"خيار", "ضمان"}

# أبعاد بنيوية: تُحذف إذا كان اسم الباب يحملها أصلًا (تفادي التكرار مثل
# «أركان البيع: الأركان»).
_STRUCTURAL_DIMS = {"اركان": "اركان", "شروط": "شروط", "انواع": "انواع"}


def dims_for_section(section_title: str) -> List[Tuple[str, str, Optional[str]]]:
    """أبعاد المسائل المناسبة للقسم: كاملة للمعاملات المالية، ومخفّفة لغيرها."""
    if section_title == "المعاملات المالية":
        return ISSUE_DIMENSIONS
    return [d for d in ISSUE_DIMENSIONS if d[0] not in _LEAN_DROP]


def dim_applies(dim_key: str, chapter: str) -> bool:
    """حذف البُعد البنيوي إذا كان اسم الباب يحمله أصلًا (تفادي التكرار)."""
    core = _STRUCTURAL_DIMS.get(dim_key)
    if core and normalize_arabic(core) in normalize_arabic(chapter):
        return False
    return True


# --------------------------------------------------------------------------- #
# التصنيف الفقهي (من كتاب البيع إلى نهاية الموسوعة)
# كل قسم: (العنوان، نوع العقدة الأساس، المجال السعودي، النظام السعودي، [كتب])
# كل كتاب: (العنوان، [أبواب])
# --------------------------------------------------------------------------- #

def _book(title: str, chapters: List[str]) -> Dict[str, Any]:
    return {"title": title, "chapters": chapters}


SECTIONS: List[Dict[str, Any]] = [
    {
        "title": "المعاملات المالية",
        "node_type": "transactions_issue",
        "saudi_domain": "المعاملات المدنية / التجارية",
        "saudi_nizam": "نظام المعاملات المدنية",
        "books": [
            _book("البيع", ["أركان البيع", "شروط البيع", "تقسيم البيع وأنواعه",
                            "البيع الفاسد والباطل", "الإقالة", "القبض والتقابض",
                            "بيع المعدوم والغرر"]),
            _book("الربا والصرف", ["ربا الفضل", "ربا النسيئة", "الصرف",
                                   "مسائل التحوّط من الربا"]),
            _book("السَّلَم والاستصناع", ["شروط السلم", "محل السلم ورأس ماله",
                                        "الاستصناع"]),
            _book("الخيارات", ["خيار المجلس", "خيار الشرط", "خيار العيب",
                              "خيار الرؤية", "خيار الغبن والتدليس", "خيار التعيين"]),
            _book("المرابحة والتولية", ["بيع المرابحة", "المرابحة للآمر بالشراء",
                                       "التولية والإشراك والوضيعة"]),
            _book("الإجارة", ["أركان الإجارة", "شروط الإجارة", "إجارة الأعيان",
                             "إجارة الأعمال والأشخاص", "فسخ الإجارة", "ضمان الأجير"]),
            _book("الشركة", ["شركة العِنان", "شركة المفاوضة", "شركة الأعمال (الأبدان)",
                            "شركة الوجوه", "أحكام الشركات المعاصرة"]),
            _book("المضاربة (القِراض)", ["شروط المضاربة", "الربح والخسارة في المضاربة",
                                        "فسخ المضاربة والنزاع فيها"]),
            _book("المزارعة والمساقاة", ["أحكام المزارعة", "أحكام المساقاة",
                                        "المغارسة"]),
            _book("الرهن", ["أركان الرهن", "شروط الرهن", "القبض في الرهن",
                           "ضمان الرهن وزوائده", "الرهن والتأمينات المعاصرة"]),
            _book("الضمان والكفالة", ["كفالة المال", "كفالة النفس", "شروط الضمان",
                                     "رجوع الضامن", "خطابات الضمان المصرفية"]),
            _book("الحوالة", ["أركان الحوالة", "شروط الحوالة", "آثار الحوالة"]),
            _book("الوكالة", ["أركان الوكالة", "أنواع الوكالة", "تصرفات الوكيل",
                             "عزل الوكيل وانعزاله"]),
            _book("الصلح", ["صلح الإبراء", "صلح المعاوضة", "الصلح على الإنكار"]),
            _book("الشُّفعة", ["شروط الشفعة", "كيفية الأخذ بالشفعة", "أسباب سقوط الشفعة"]),
            _book("الهبة", ["أركان الهبة", "شروط الهبة", "الرجوع في الهبة",
                           "العُمرى والرُّقبى", "هبة المريض"]),
            _book("العارية", ["أحكام العارية", "ضمان العارية"]),
            _book("الوديعة", ["أحكام الوديعة", "ضمان الوديعة والتعدي فيها"]),
            _book("الغصب والإتلاف", ["ضمان المغصوب", "منافع المغصوب وزوائده",
                                    "الإتلاف المباشر والتسبب", "ضمان الصنّاع"]),
            _book("اللقطة واللقيط", ["تعريف اللقطة وتعريفها", "تملّك اللقطة",
                                    "أحكام اللقيط"]),
            _book("إحياء الموات", ["شروط الإحياء", "الإقطاع", "الحريم والمرافق",
                                  "المياه والكلأ"]),
            _book("الوقف", ["أركان الوقف", "شروط الوقف", "الناظر وولايته",
                           "الوقف الذرّي والخيري", "استبدال الوقف"]),
            _book("القِسمة", ["قسمة الإجبار", "قسمة التراضي", "قسمة المنافع (المهايأة)"]),
            _book("الجَعالة والسَّبق", ["أحكام الجَعالة", "السَّبق والمسابقات"]),
            _book("القرض", ["أحكام القرض", "القرض الذي يجرّ نفعًا", "السفتجة"]),
            _book("التفليس والحجر", ["أحكام المفلس", "الحجر للسفه والصغر",
                                    "الحجر لحظّ الغير", "الإفلاس المعاصر"]),
            _book("بيوع ومعاملات معاصرة", ["بيع العربون", "بيع التقسيط والتورّق",
                                          "الأوراق التجارية وخصمها", "بطاقات الائتمان",
                                          "التأمين التجاري والتعاوني",
                                          "المعاملات المصرفية الإسلامية"]),
        ],
    },
    {
        "title": "الأحوال الشخصية والأسرة",
        "node_type": "family_issue",
        "saudi_domain": "الأحوال الشخصية",
        "saudi_nizam": "نظام الأحوال الشخصية",
        "books": [
            _book("النكاح", ["أركان النكاح", "شروط النكاح", "الولاية في النكاح",
                            "الكفاءة", "المحرمات من النساء", "الأنكحة المنهي عنها"]),
            _book("الصداق (المهر)", ["تسمية المهر", "مهر المثل", "تنصيف المهر وتشطيره",
                                    "النزاع في المهر"]),
            _book("العشرة وحقوق الزوجين", ["حقوق الزوجين", "القَسْم بين الزوجات",
                                          "النشوز", "الشِّقاق والتحكيم"]),
            _book("الطلاق", ["أركان الطلاق", "ألفاظ الطلاق وكناياته",
                            "الطلاق السني والبدعي", "الطلاق المعلّق",
                            "طلاق الغضبان والسكران", "الطلاق الثلاث بلفظ واحد"]),
            _book("الخلع", ["أحكام الخلع", "عوض الخلع", "الخلع وتعليقه"]),
            _book("الرجعة", ["شروط الرجعة", "الإشهاد على الرجعة"]),
            _book("الإيلاء والظهار", ["أحكام الإيلاء", "أحكام الظهار",
                                     "كفارة الظهار"]),
            _book("اللعان", ["أحكام اللعان", "آثار اللعان"]),
            _book("العِدّة والاستبراء", ["عدة الوفاة", "عدة الطلاق", "عدة الحامل",
                                       "الاستبراء", "الإحداد"]),
            _book("الرضاع", ["المحرمية بالرضاع", "مقدار الرضاع المحرّم وشروطه"]),
            _book("النفقات", ["نفقة الزوجة", "نفقة الأقارب", "نفقة المحضون",
                             "إعسار المنفق", "نفقة المعتدة"]),
            _book("الحضانة", ["شروط الحاضن", "مدة الحضانة", "أسباب سقوط الحضانة",
                             "أجرة الحضانة والرؤية"]),
            _book("النسب", ["إثبات النسب", "نفي النسب", "أحكام ولد الزنا واللقيط"]),
        ],
    },
    {
        "title": "المواريث والوصايا",
        "node_type": "inheritance_issue",
        "saudi_domain": "الأحوال الشخصية / التركات",
        "saudi_nizam": "نظام الأحوال الشخصية (أحكام التركات)",
        "books": [
            _book("الفرائض (المواريث)", ["أسباب الإرث وموانعه", "أصحاب الفروض",
                                        "العَصَبات", "الحجب والتعصيب",
                                        "العَول والرَّد", "ميراث الحمل والمفقود والخنثى",
                                        "المسائل الخاصة (المشتركة والأكدرية)",
                                        "التخارج وقسمة التركة"]),
            _book("الوصايا", ["أركان الوصية", "الوصية للوارث", "حدود الثلث",
                             "الرجوع في الوصية", "الوصية الواجبة", "الوصية بالمنافع"]),
        ],
    },
    {
        "title": "الجنايات والحدود",
        "node_type": "criminal_qisas_issue",
        "saudi_domain": "الجزائي / الأنظمة الجزائية",
        "saudi_nizam": "الأنظمة الجزائية وأحكام القصاص والحدود",
        "books": [
            _book("الجنايات والقصاص", ["أنواع الجنايات", "شروط وجوب القصاص",
                                      "القصاص فيما دون النفس", "العفو والصلح عن القصاص",
                                      "موانع القصاص", "الاشتراك في الجناية"]),
            _book("الديات", ["دية النفس", "دية الأطراف والمنافع", "الأرش والحكومة",
                            "العاقلة وأحكامها", "دية الجنين (الغُرّة)",
                            "التغليظ في الدية"]),
            _book("القسامة", ["شروط القسامة", "أحكام القسامة وأيمانها"]),
            _book("حد الزنا", ["إثبات الزنا", "شروط الإحصان", "عقوبة الزاني",
                              "درء الحد بالشبهة"]),
            _book("حد القذف", ["شروط وجوب حد القذف", "عقوبة القذف", "سقوط حد القذف"]),
            _book("حد السرقة", ["شروط القطع", "النصاب والحِرز", "موانع القطع",
                               "تعدد السرقة"]),
            _book("حد الحرابة", ["تعريف الحرابة وصورها", "عقوبات الحرابة",
                                "توبة المحارب"]),
            _book("حد الشرب والمسكر", ["إثبات الشرب", "عقوبة الشرب", "المخدرات قياسًا"]),
            _book("الردة والبغي", ["أحكام المرتد", "استتابة المرتد", "أحكام البغاة"]),
            _book("التعزير", ["ضوابط التعزير", "أنواع العقوبات التعزيرية",
                             "التعزير بالمال", "الموازنة بين الحد والتعزير"]),
        ],
    },
    {
        "title": "القضاء والإثبات والأيمان",
        "node_type": "procedural_issue",
        "saudi_domain": "المرافعات الشرعية / الإثبات",
        "saudi_nizam": "نظام المرافعات الشرعية ونظام الإثبات",
        "books": [
            _book("القضاء", ["شروط القاضي", "آداب القضاء", "ولاية القضاء واختصاصه",
                            "قضاء القاضي بعلمه", "تعدد القضاة ونقض الأحكام"]),
            _book("الدعوى", ["أركان الدعوى", "شروط صحة الدعوى", "تحرير الدعوى",
                            "الدعاوى الكيدية", "تعارض الدعاوى"]),
            _book("البينات والقرائن", ["البينة على المدّعي", "تعارض البينات",
                                      "القرائن والأمارات", "القافة والخبرة"]),
            _book("الشهادة", ["شروط الشاهد", "نصاب الشهادة", "الشهادة على الشهادة",
                             "الرجوع عن الشهادة", "جرح الشهود وتعديلهم"]),
            _book("اليمين والنكول", ["يمين المدّعى عليه", "النكول ورد اليمين",
                                    "اليمين الغموس", "اليمين مع الشاهد"]),
            _book("الإقرار", ["أركان الإقرار", "شروط الإقرار", "الإقرار بالمجهول",
                             "الاستثناء في الإقرار", "الرجوع عن الإقرار"]),
            _book("التحكيم والصلح القضائي", ["أحكام التحكيم", "شروط المحكّم",
                                            "الصلح أمام القضاء"]),
            _book("الأيمان والنذور والكفارات", ["أنواع الأيمان", "كفارة اليمين",
                                               "أحكام النذر وأنواعه", "الكفارات"]),
        ],
    },
]


# --------------------------------------------------------------------------- #
# الربط بالأنظمة السعودية (الباب/العقد + مرجع المادة + المصدر الرسمي)
# --------------------------------------------------------------------------- #
# روابط الأنظمة الرسمية
NIZAM_URLS = {
    "المعاملات المدنية": "https://laws.moj.gov.sa/ar/legislation/PBbHmywh1XMp-Kyv3NtQLg",
    "الأحوال الشخصية": "https://laws.boe.gov.sa/BoeLaws/Laws/LawDetails/4d72d829-947b-45d5-b9b5-ae5800d6bac2/1",
    "المرافعات": "https://laws.moj.gov.sa/ar/",
    "الإثبات": "https://laws.moj.gov.sa/ar/",
    "الشركات": "https://laws.moj.gov.sa/ar/",
    "الإفلاس": "https://laws.moj.gov.sa/ar/",
    "التحكيم": "https://laws.moj.gov.sa/ar/",
    "جزائي": "https://laws.moj.gov.sa/ar/",
    "عام": "https://laws.moj.gov.sa/ar/",
}

# مرجع المادة: نُدرج النطاق المؤكَّد فقط؛ وما عداه "يُحدَّد بالمراجعة" تفاديًا للتخمين.
_ART_TBD = "يُحدَّد بالمراجعة"

# خريطة الكتاب الفقهي → (النظام، الباب/العقد النظامي، مرجع المادة، مفتاح الرابط)
BOOK_NIZAM_MAP: Dict[str, Tuple[str, str, str, str]] = {
    # ---- نظام المعاملات المدنية ----
    "البيع": ("نظام المعاملات المدنية", "العقود المسماة > العقود الناقلة للملكية > عقد البيع", _ART_TBD, "المعاملات المدنية"),
    "الربا والصرف": ("نظام المعاملات المدنية", "أحكام العقد > محل العقد ومشروعيته (مع مراعاة منع الربا)", _ART_TBD, "المعاملات المدنية"),
    "السَّلَم والاستصناع": ("نظام المعاملات المدنية", "العقود الناقلة للملكية > البيع / الاستصناع", _ART_TBD, "المعاملات المدنية"),
    "الخيارات": ("نظام المعاملات المدنية", "أحكام العقد > الخيارات وفسخ العقد والعيوب", _ART_TBD, "المعاملات المدنية"),
    "المرابحة والتولية": ("نظام المعاملات المدنية", "العقود الناقلة للملكية > عقد البيع (المرابحة)", _ART_TBD, "المعاملات المدنية"),
    "الإجارة": ("نظام المعاملات المدنية", "العقود المسماة > عقد الإيجار", _ART_TBD, "المعاملات المدنية"),
    "الشركة": ("نظام الشركات / نظام المعاملات المدنية", "عقود المشاركات > عقد الشركة", _ART_TBD, "الشركات"),
    "المضاربة (القِراض)": ("نظام المعاملات المدنية", "عقود المشاركات > عقد المضاربة", _ART_TBD, "المعاملات المدنية"),
    "المزارعة والمساقاة": ("نظام المعاملات المدنية", "عقود المشاركات > عقد المشاركة في الناتج (المزارعة/المساقاة)", _ART_TBD, "المعاملات المدنية"),
    "الرهن": ("نظام المعاملات المدنية", "الحقوق العينية التبعية (التأمينات) > الرهن", _ART_TBD, "المعاملات المدنية"),
    "الضمان والكفالة": ("نظام المعاملات المدنية", "العقود المسماة > عقد الكفالة", _ART_TBD, "المعاملات المدنية"),
    "الحوالة": ("نظام المعاملات المدنية", "انتقال الالتزام > حوالة الحق وحوالة الدين", _ART_TBD, "المعاملات المدنية"),
    "الوكالة": ("نظام المعاملات المدنية", "العقود الواردة على العمل > عقد الوكالة", _ART_TBD, "المعاملات المدنية"),
    "الصلح": ("نظام المعاملات المدنية", "العقود الناقلة للملكية > عقد الصلح", _ART_TBD, "المعاملات المدنية"),
    "الشُّفعة": ("نظام المعاملات المدنية", "الحقوق العينية الأصلية > الملكية > الشفعة", _ART_TBD, "المعاملات المدنية"),
    "الهبة": ("نظام المعاملات المدنية", "العقود الناقلة للملكية > عقد الهبة", _ART_TBD, "المعاملات المدنية"),
    "العارية": ("نظام المعاملات المدنية", "العقود المسماة > العارية / الانتفاع", _ART_TBD, "المعاملات المدنية"),
    "الوديعة": ("نظام المعاملات المدنية", "العقود الواردة على العمل > عقد الإيداع", _ART_TBD, "المعاملات المدنية"),
    "الغصب والإتلاف": ("نظام المعاملات المدنية", "مصادر الالتزام > الفعل الضار (الضرر والتعويض)", _ART_TBD, "المعاملات المدنية"),
    "اللقطة واللقيط": ("نظام المعاملات المدنية / الأحوال الشخصية", "الفعل النافع (الإثراء بلا سبب) + أحكام اللقيط", _ART_TBD, "المعاملات المدنية"),
    "إحياء الموات": ("نظام المعاملات المدنية", "الحقوق العينية الأصلية > الملكية وأسباب كسبها", _ART_TBD, "المعاملات المدنية"),
    "الوقف": ("أنظمة الأوقاف", "أحكام الوقف (ترتيبات الهيئة العامة للأوقاف)", _ART_TBD, "عام"),
    "القِسمة": ("نظام المعاملات المدنية", "الحقوق العينية > الملكية الشائعة والقسمة", _ART_TBD, "المعاملات المدنية"),
    "الجَعالة والسَّبق": ("نظام المعاملات المدنية", "مصادر الالتزام > الإرادة المنفردة (الوعد بجائزة/الجعالة)", _ART_TBD, "المعاملات المدنية"),
    "القرض": ("نظام المعاملات المدنية", "العقود الناقلة للملكية > عقد القرض", _ART_TBD, "المعاملات المدنية"),
    "التفليس والحجر": ("نظام الإفلاس / نظام المعاملات المدنية", "الأشخاص والأهلية (الحجر) + إجراءات الإفلاس", _ART_TBD, "الإفلاس"),
    "بيوع ومعاملات معاصرة": ("أنظمة خاصة + المعاملات المدنية", "العقود غير المسماة + أنظمة (الأوراق التجارية/التمويل/التأمين)", _ART_TBD, "المعاملات المدنية"),
    # ---- نظام الأحوال الشخصية (252 مادة، 8 أبواب) ----
    "النكاح": ("نظام الأحوال الشخصية", "الباب الأول: الزواج (الأركان والشروط)", _ART_TBD, "الأحوال الشخصية"),
    "الصداق (المهر)": ("نظام الأحوال الشخصية", "الباب الأول: الزواج (الصداق)", _ART_TBD, "الأحوال الشخصية"),
    "العشرة وحقوق الزوجين": ("نظام الأحوال الشخصية", "الباب الأول: الزواج (حقوق الزوجين)", _ART_TBD, "الأحوال الشخصية"),
    "الطلاق": ("نظام الأحوال الشخصية", "الباب الثالث: الفرقة بين الزوجين > الطلاق", _ART_TBD, "الأحوال الشخصية"),
    "الخلع": ("نظام الأحوال الشخصية", "الباب الثالث: الفرقة بين الزوجين > الخلع", _ART_TBD, "الأحوال الشخصية"),
    "الرجعة": ("نظام الأحوال الشخصية", "الباب الثالث: الفرقة بين الزوجين (الرجعة)", _ART_TBD, "الأحوال الشخصية"),
    "الإيلاء والظهار": ("نظام الأحوال الشخصية", "الباب الثالث: الفرقة (فسخ الزواج وأسبابه)", _ART_TBD, "الأحوال الشخصية"),
    "اللعان": ("نظام الأحوال الشخصية", "الباب الثاني/الثالث: النسب واللعان", _ART_TBD, "الأحوال الشخصية"),
    "العِدّة والاستبراء": ("نظام الأحوال الشخصية", "الباب الرابع: آثار الفرقة > العدة", _ART_TBD, "الأحوال الشخصية"),
    "الرضاع": ("نظام الأحوال الشخصية", "الباب الثاني: آثار عقد الزواج > النسب/الرضاع", _ART_TBD, "الأحوال الشخصية"),
    "النفقات": ("نظام الأحوال الشخصية", "الباب الثاني: آثار عقد الزواج > النفقة", _ART_TBD, "الأحوال الشخصية"),
    "الحضانة": ("نظام الأحوال الشخصية", "الباب الرابع: آثار الفرقة > الحضانة", _ART_TBD, "الأحوال الشخصية"),
    "النسب": ("نظام الأحوال الشخصية", "الباب الثاني: آثار عقد الزواج > النسب", _ART_TBD, "الأحوال الشخصية"),
    "الفرائض (المواريث)": ("نظام الأحوال الشخصية", "الباب السابع: التركة والإرث", _ART_TBD, "الأحوال الشخصية"),
    "الوصايا": ("نظام الأحوال الشخصية", "الباب السادس: الوصية", _ART_TBD, "الأحوال الشخصية"),
    # ---- الجنايات والحدود (غير مقننة في نظام عقوبات عام) ----
    "الجنايات والقصاص": ("أحكام شرعية + أنظمة جزائية", "القصاص (أحكام شرعية) + نظام الإجراءات الجزائية", _ART_TBD, "جزائي"),
    "الديات": ("أحكام شرعية + أنظمة", "الديات (أحكام شرعية) + اللائحة/الجداول المعتمدة", _ART_TBD, "جزائي"),
    "القسامة": ("أحكام شرعية", "القسامة (أحكام شرعية قضائية)", _ART_TBD, "جزائي"),
    "حد الزنا": ("أحكام شرعية (حدود)", "حد الزنا (أحكام شرعية)", _ART_TBD, "جزائي"),
    "حد القذف": ("أحكام شرعية (حدود)", "حد القذف (أحكام شرعية) + أنظمة الحماية من الإيذاء", _ART_TBD, "جزائي"),
    "حد السرقة": ("أحكام شرعية (حدود)", "حد السرقة (أحكام شرعية) + الأنظمة الجزائية", _ART_TBD, "جزائي"),
    "حد الحرابة": ("أحكام شرعية (حدود)", "الحرابة (أحكام شرعية) + أنظمة جزائية خاصة", _ART_TBD, "جزائي"),
    "حد الشرب والمسكر": ("أحكام شرعية + أنظمة", "المسكرات (أحكام شرعية) + نظام مكافحة المخدرات", _ART_TBD, "جزائي"),
    "الردة والبغي": ("أحكام شرعية", "الردة والبغي (أحكام شرعية قضائية)", _ART_TBD, "جزائي"),
    "التعزير": ("أنظمة جزائية تعزيرية", "العقوبات التعزيرية (الأنظمة الجزائية والمرجعية القضائية)", _ART_TBD, "جزائي"),
    # ---- القضاء والإثبات والأيمان ----
    "القضاء": ("نظام المرافعات الشرعية", "الاختصاص والولاية القضائية", _ART_TBD, "المرافعات"),
    "الدعوى": ("نظام المرافعات الشرعية", "رفع الدعوى وقيدها وشروط قبولها", _ART_TBD, "المرافعات"),
    "البينات والقرائن": ("نظام الإثبات", "أدلة الإثبات والقرائن", _ART_TBD, "الإثبات"),
    "الشهادة": ("نظام الإثبات", "الشهادة (الباب الخاص بالشهادة)", _ART_TBD, "الإثبات"),
    "اليمين والنكول": ("نظام الإثبات", "اليمين (الباب الخاص باليمين)", _ART_TBD, "الإثبات"),
    "الإقرار": ("نظام الإثبات", "الإقرار (الباب الخاص بالإقرار)", _ART_TBD, "الإثبات"),
    "التحكيم والصلح القضائي": ("نظام التحكيم / المرافعات الشرعية", "التحكيم + الصلح القضائي", _ART_TBD, "التحكيم"),
    "الأيمان والنذور والكفارات": ("أحكام شرعية عامة", "خارج التقنين النظامي (مرجعية شرعية)", _ART_TBD, "عام"),
}


def nizam_mapping(book_title: str, default_nizam: str) -> Tuple[str, str, str, str]:
    """يُعيد (النظام، الباب/العقد النظامي، مرجع المادة، رابط النظام)."""
    nizam, chapter, art, url_key = BOOK_NIZAM_MAP.get(
        book_title, (default_nizam, _ART_TBD, _ART_TBD, "عام"))
    return nizam, chapter, art, NIZAM_URLS.get(url_key, NIZAM_URLS["عام"])


# --------------------------------------------------------------------------- #
# المواءمة السعودية ومسار حكيم
# --------------------------------------------------------------------------- #

def book_overrides(book_title: str, base_type: str, base_domain: str,
                   base_nizam: str) -> Tuple[str, str, str]:
    """تخصيص النوع/المجال/النظام لبعض الكتب ذات الطابع التجاري أو الخاص."""
    commercial = ("الشركة", "المضاربة", "بيوع ومعاملات معاصرة", "التفليس والحجر",
                  "الأوراق", "الصرف")
    if any(k in book_title for k in commercial):
        return ("commercial_issue", "المعاملات التجارية", "النظام التجاري / نظام الشركات")
    return (base_type, base_domain, base_nizam)


def build_hakeem_path(section_title: str, book_title: str, chapter: str,
                      issue_title: str) -> str:
    return " > ".join([section_title, book_title, chapter, issue_title])


def issue_confidence(dim_key: str) -> float:
    # عناوين المسائل الأساسية أوضح من المستنتجة
    if dim_key in ("تعريف", "حكم", "اركان", "شروط", "انواع"):
        return 0.80
    if dim_key in ("تكييف", "معاصر"):
        return 0.55  # مواءمة نظامية تحتاج مراجعة أعمق
    return 0.70


# --------------------------------------------------------------------------- #
# توليد السجلات والشجرة
# --------------------------------------------------------------------------- #

def build_record(*, title: str, level: int, parent_title: str, node_type: str,
                 section: str, book: str, saudi_domain: str, saudi_nizam: str,
                 hakeem_path: str, confidence: float, selector: str,
                 source_url: str, nizam_chapter: str = "—",
                 article_ref: str = "—", nizam_url: str = "—"
                 ) -> "OrderedDict[str, Any]":
    rec: "OrderedDict[str, Any]" = OrderedDict()
    rec["source"] = SOURCE_NAME
    rec["source_url"] = source_url
    rec["jurisdiction"] = JURISDICTION
    rec["level"] = level
    rec["parent_title"] = parent_title
    rec["node_title"] = title
    rec["normalized_title"] = normalize_arabic(title)
    rec["node_type"] = node_type
    rec["section"] = section
    rec["book"] = book
    rec["suggested_saudi_domain"] = saudi_domain
    rec["suggested_saudi_nizam"] = saudi_nizam
    rec["suggested_saudi_nizam_chapter"] = nizam_chapter
    rec["suggested_saudi_article_ref"] = article_ref
    rec["saudi_nizam_url"] = nizam_url
    rec["suggested_hakeem_issue_path"] = hakeem_path
    rec["mapping_type"] = MAPPING_TYPE
    rec["confidence"] = confidence
    rec["needs_human_review"] = True
    rec["evidence"] = OrderedDict([
        ("url", source_url),
        ("selector", selector),
        ("text_snippet", title[:280]),
    ])
    return rec


def generate() -> Tuple[List["OrderedDict[str, Any]"], "OrderedDict[str, Any]"]:
    """يولّد قائمة السجلات المسطّحة + الشجرة الهرمية."""
    records: List["OrderedDict[str, Any]"] = []
    src = OPEN_SOURCES["shamela"]

    root = OrderedDict([
        ("node_title", "الموسوعة الفقهية الكويتية — من كتاب البيع إلى نهاية الموسوعة"),
        ("level", 0), ("node_type", "fiqh_root"), ("children", [])
    ])
    records.append(build_record(
        title=root["node_title"], level=0, parent_title="", node_type="fiqh_root",
        section="", book="", saudi_domain="—", saudi_nizam="—",
        hakeem_path=root["node_title"], confidence=0.90, selector="fiqh_index",
        source_url=src,
    ))

    for sec in SECTIONS:
        sec_node = OrderedDict([
            ("node_title", sec["title"]), ("level", 1),
            ("node_type", "fiqh_section"), ("children", [])
        ])
        records.append(build_record(
            title=sec["title"], level=1, parent_title=root["node_title"],
            node_type="fiqh_section", section=sec["title"], book="",
            saudi_domain=sec["saudi_domain"], saudi_nizam=sec["saudi_nizam"],
            hakeem_path=sec["title"], confidence=0.85, selector="fiqh_index",
            source_url=src,
        ))

        for bk in sec["books"]:
            b_type, b_domain, _bn = book_overrides(
                bk["title"], sec["node_type"], sec["saudi_domain"], sec["saudi_nizam"])
            # الربط النظامي السعودي على مستوى الكتاب (يرثه الباب والمسألة)
            b_nizam, b_chapter, b_art, b_url = nizam_mapping(
                bk["title"], sec["saudi_nizam"])
            book_node = OrderedDict([
                ("node_title", bk["title"]), ("level", 2),
                ("node_type", "fiqh_book"),
                ("suggested_saudi_nizam", b_nizam),
                ("suggested_saudi_nizam_chapter", b_chapter),
                ("children", [])
            ])
            records.append(build_record(
                title=bk["title"], level=2, parent_title=sec["title"],
                node_type="fiqh_book", section=sec["title"], book=bk["title"],
                saudi_domain=b_domain, saudi_nizam=b_nizam,
                nizam_chapter=b_chapter, article_ref=b_art, nizam_url=b_url,
                hakeem_path=f"{sec['title']} > {bk['title']}",
                confidence=0.80, selector="fiqh_index", source_url=src,
            ))

            for chapter in bk["chapters"]:
                chap_node = OrderedDict([
                    ("node_title", chapter), ("level", 3),
                    ("node_type", "fiqh_chapter"), ("children", [])
                ])
                records.append(build_record(
                    title=chapter, level=3, parent_title=bk["title"],
                    node_type="fiqh_chapter", section=sec["title"], book=bk["title"],
                    saudi_domain=b_domain, saudi_nizam=b_nizam,
                    nizam_chapter=b_chapter, article_ref=b_art, nizam_url=b_url,
                    hakeem_path=f"{sec['title']} > {bk['title']} > {chapter}",
                    confidence=0.75, selector="fiqh_index", source_url=src,
                ))

                for dim_key, template, dim_type in dims_for_section(sec["title"]):
                    if not dim_applies(dim_key, chapter):
                        continue
                    issue_title = template.format(ch=chapter)
                    ntype = dim_type or b_type
                    path = build_hakeem_path(sec["title"], bk["title"], chapter,
                                             issue_title)
                    rec = build_record(
                        title=issue_title, level=4, parent_title=chapter,
                        node_type=ntype, section=sec["title"], book=bk["title"],
                        saudi_domain=b_domain, saudi_nizam=b_nizam,
                        nizam_chapter=b_chapter, article_ref=b_art, nizam_url=b_url,
                        hakeem_path=path, confidence=issue_confidence(dim_key),
                        selector="generated", source_url=src,
                    )
                    records.append(rec)
                    chap_node["children"].append(OrderedDict([
                        ("node_title", issue_title), ("level", 4),
                        ("node_type", ntype),
                        ("suggested_saudi_nizam", b_nizam),
                        ("suggested_saudi_nizam_chapter", b_chapter),
                        ("confidence", rec["confidence"]),
                    ]))
                book_node["children"].append(chap_node)
            sec_node["children"].append(book_node)
        root["children"].append(sec_node)

    return records, root


# --------------------------------------------------------------------------- #
# الإخراج
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
    cols = ["source", "jurisdiction", "level", "section", "book", "parent_title",
            "node_title", "normalized_title", "node_type", "suggested_saudi_domain",
            "suggested_saudi_nizam", "suggested_saudi_nizam_chapter",
            "suggested_saudi_article_ref", "saudi_nizam_url",
            "suggested_hakeem_issue_path", "mapping_type",
            "confidence", "needs_human_review"]
    with path.open("w", encoding="utf-8", newline="") as fh:
        w = csv.DictWriter(fh, fieldnames=cols, extrasaction="ignore")
        w.writeheader()
        for rec in records:
            w.writerow(rec)


def write_sample(path: Path, records: List[Dict[str, Any]], n: int = 30) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    issues = [r for r in records if r["level"] == 4][:n]
    with path.open("w", encoding="utf-8") as fh:
        for rec in issues:
            fh.write(json.dumps(rec, ensure_ascii=False) + "\n")


def write_report(path: Path, records: List[Dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    by_level = Counter(r["level"] for r in records)
    by_type = Counter(r["node_type"] for r in records)
    by_section = Counter(r["section"] for r in records if r["section"] and r["level"] == 4)
    by_nizam = Counter(r["suggested_saudi_nizam"] for r in records if r["level"] == 4)
    issues = by_level.get(4, 0)

    lines = ["# تقرير حصر المسائل الفقهية (من كتاب البيع إلى نهاية الموسوعة)\n"]
    lines.append(f"- المصدر: {SOURCE_NAME}")
    lines.append(f"- المكتبات المفتوحة: الشاملة {OPEN_SOURCES['shamela']} · "
                 f"ketabonline {OPEN_SOURCES['ketabonline']}")
    lines.append("")
    lines.append("## الأعداد")
    lines.append(f"- إجمالي العقد: **{len(records)}**")
    lines.append(f"- **عدد المسائل (المستوى 4): {issues}**  "
                 f"{'✅ ≥ 3000' if issues >= 3000 else '⚠️ < 3000'}")
    lines.append(f"- الكتب الفقهية (L2): {by_level.get(2,0)} · "
                 f"الأبواب (L3): {by_level.get(3,0)} · الأقسام (L1): {by_level.get(1,0)}")
    lines.append("")
    lines.append("## المسائل حسب القسم")
    for sec, c in by_section.most_common():
        lines.append(f"- {sec}: {c}")
    lines.append("")
    lines.append("## المسائل حسب النظام السعودي المقترح")
    for nz, c in by_nizam.most_common():
        lines.append(f"- {nz}: {c}")
    lines.append("")
    by_chapter = Counter(
        (r["book"], r["suggested_saudi_nizam"], r["suggested_saudi_nizam_chapter"])
        for r in records if r["level"] == 2)
    lines.append("## الربط النظامي على مستوى الكتاب (الكتاب → النظام → الباب/العقد)")
    for (bk, nz, ch), _c in by_chapter.most_common():
        lines.append(f"- **{bk}** → {nz} — {ch}")
    lines.append("")
    lines.append("> مرجع المادة الدقيق (رقم المادة) موسوم بـ «يُحدَّد بالمراجعة» حيثما "
                 "لم يُتحقَّق منه نصًّا، تفاديًا للتخمين؛ يُكمله المختص من النص الرسمي.")
    lines.append("")
    lines.append("## العقد حسب node_type")
    for t, c in by_type.most_common():
        lines.append(f"- `{t}`: {c}")
    lines.append("")
    lines.append("## تنبيه")
    lines.append("> بذرة هيكلية فقهية (fiqh_seed) للحصر والتبويب؛ كل مسألة تحمل "
                 "`needs_human_review = true` وتحتاج **مراجعة صياغة سعودية** "
                 "وربطًا دقيقًا بالأنظمة قبل الاعتماد. ليست فتوى ولا نظامًا معتمدًا.")
    lines.append("")
    path.write_text("\n".join(lines), encoding="utf-8")


def validate(records: List[Dict[str, Any]]) -> int:
    required = ["source", "jurisdiction", "level", "node_title", "normalized_title",
                "node_type", "suggested_saudi_nizam", "suggested_saudi_nizam_chapter",
                "suggested_saudi_article_ref", "saudi_nizam_url",
                "suggested_hakeem_issue_path", "mapping_type", "confidence",
                "needs_human_review", "evidence"]
    errors = 0
    for r in records:
        for k in required:
            if k not in r:
                errors += 1
        if r["node_type"] not in NODE_TYPES:
            errors += 1
        if not (0.0 <= float(r["confidence"]) <= 1.0):
            errors += 1
        if r["needs_human_review"] is not True:
            errors += 1
    return errors


def main(argv: Optional[List[str]] = None) -> int:
    p = argparse.ArgumentParser(description="Fiqh Issue Tree Generator")
    p.add_argument("--out-jsonl", default="data/legal_issues/fiqh_issue_candidates.jsonl")
    p.add_argument("--out-tree", default="data/legal_issues/fiqh_issue_tree.json")
    p.add_argument("--out-csv", default="data/legal_issues/fiqh_issue_candidates.csv")
    p.add_argument("--out-sample", default="data/samples/fiqh_issue_tree_sample.jsonl")
    p.add_argument("--out-report", default="data/legal_issues/fiqh_extraction_report.md")
    args = p.parse_args(argv)

    records, tree = generate()
    errors = validate(records)
    issues = sum(1 for r in records if r["level"] == 4)

    write_jsonl(Path(args.out_jsonl), records)
    write_tree(Path(args.out_tree), tree)
    write_csv(Path(args.out_csv), records)
    write_sample(Path(args.out_sample), records)
    write_report(Path(args.out_report), records)

    print("=" * 60)
    print("حصر المسائل الفقهية (المعاملات → نهاية الموسوعة)")
    print("=" * 60)
    print(f"إجمالي العقد        : {len(records)}")
    print(f"عدد المسائل (L4)    : {issues}  {'✅ ≥3000' if issues>=3000 else '⚠️ <3000'}")
    print(f"الكتب الفقهية (L2)  : {sum(1 for r in records if r['level']==2)}")
    print(f"الأبواب (L3)        : {sum(1 for r in records if r['level']==3)}")
    print(f"أخطاء المخطط        : {errors}")
    print(f"\nالمخرجات: {args.out_jsonl} · {args.out_tree} · {args.out_csv}")
    print("تنبيه: بذرة فقهية تحتاج مراجعة صياغة سعودية وربطًا بالأنظمة.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
