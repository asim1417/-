# مستخرج شجرة المسائل القانونية من الموسوعة القانونية المصرية

**Egyptian Legal Encyclopedia Issue Tree Extractor**

أداة مستقلة لاستخراج "شجرة مسائل قانونية" من البنية العامة للموسوعة القانونية
المصرية، لاستخدامها كبذرة هيكلية أولية (structural seed) في
**Hakeem Legal Issues Core**.

> ⚠️ هذه مرحلة مستقلة فقط. الأداة **لا تتصل بقاعدة بيانات الإنتاج**، ولا تنشئ
> أي migration، ولا تنفّذ db push، ولا تعمل seed للإنتاج.

---

## 1) الهدف

بناء شجرة مسائل قانونية عملية مكوّنة من 5 مستويات انطلاقًا من بنية الموسوعة
المصرية المتاحة علنًا، تشمل: موسوعة التشريعات، موسوعة الأحكام، موسوعة النيابة،
الموسوعة الجنائية، الموسوعة المدنية، القاموس القانوني، الدفوع، الحيثيات، القيود
والأوصاف، البطلان والمواعيد، نماذج الأحكام، قواعد المواريث، منشورات الشهر
العقاري، فتاوى مجلس الدولة، أحكام النقض، الدستورية العليا، المحكمة الإدارية
العليا، والقضاء الإداري.

ثم إرفاق **مواءمة سعودية مبدئية** بكل عقدة (مجال سعودي مقترح + مسار حكيم مقترح +
درجة ثقة) لتكون نقطة انطلاق لمراجعة بشرية.

## 2) طريقة التشغيل

الأداة تعتمد فقط على المكتبة القياسية لبايثون 3 (لا تبعيات خارجية).

```bash
python scripts/legal_issues/egypt_moj_issue_tree_extractor.py \
  --max-pages 5 \
  --delay 2 \
  --out-jsonl data/legal_issues/egypt_moj_issue_candidates.jsonl \
  --out-tree  data/legal_issues/egypt_moj_issue_tree_seed.json \
  --log       data/legal_issues/egypt_moj_run_log.json
```

### الخيارات

| الخيار | الوصف | الافتراضي |
| --- | --- | --- |
| `--max-pages` | أقصى عدد صفحات للزيارة | `5` |
| `--delay` | تأخير بين الطلبات (ثوانٍ) | `2.0` |
| `--timeout` | مهلة الطلب (ثوانٍ) | `20.0` |
| `--config` | ملف مصادر JSON | `config/legal_issues/egypt_moj_sources.json` |
| `--out-jsonl` | ملف JSONL المسطّح | `data/legal_issues/egypt_moj_issue_candidates.jsonl` |
| `--out-tree` | ملف الشجرة الهرمية | `data/legal_issues/egypt_moj_issue_tree_seed.json` |
| `--out-csv` | ملف CSV (اختياري) | `data/legal_issues/egypt_moj_issue_candidates.csv` |
| `--out-sample` | ملف العينة | `data/samples/egypt_moj_issue_tree_sample.jsonl` |
| `--out-report` | تقرير التشغيل (md) | `data/legal_issues/egypt_moj_extraction_report.md` |
| `--log` | سجل التشغيل JSON | `data/legal_issues/egypt_moj_run_log.json` |
| `--no-network` | تخطّي الزحف والاكتفاء بالبذرة الهيكلية | `false` |
| `--no-robots` | عدم قراءة robots.txt (غير مستحسن) | `false` |
| `--no-csv` | عدم كتابة ملف CSV | `false` |

تشغيل الاختبارات:

```bash
python tests/legal_issues/test_egypt_moj_issue_tree_extractor.py
# أو عبر pytest
pytest tests/legal_issues/
```

## 3) حدود المصدر والالتزامات الأخلاقية

الأداة مصمّمة لتكون **مهذّبة وآمنة** بشكل صارم:

- **لا تتجاوز تسجيل الدخول** ولا تستخدم أي بيانات اعتماد.
- **لا تكسر أي حماية** ولا تسحب محتوى مغلقًا أو خاصًا بالمشتركين.
- تحترم `robots.txt` متى توفّر؛ وإذا منعت السياسة الوصول فإنها **تتوقّف بأدب**.
- تتجنّب أي رابط يحتوي الأنماط:
  `login`, `account`, `subscription`, `payment`, `signin`, `register`, `auth`,
  `profile`.
- تقتصر على النطاقات المسموح بها في ملف الإعدادات.
- User-Agent واضح ومعرّف: `HakeemLegalIssuesResearchBot/0.1`.
- تطبّق retry/backoff عند أخطاء المهلة أو DNS، ولا تتجاوز `--max-pages`.
- تتعامل فقط مع **الفهارس العامة والعناوين والقوائم وروابط الأقسام** المتاحة علنًا.

> ملاحظة تشغيلية: إن لم يتوفّر وصول شبكي (أو منعت `robots.txt` الزحف)، تنتج
> الأداة الشجرة من **البذرة الهيكلية المضمونة** المبنية على بنية الموسوعة
> المعروفة علنًا، وتسجّل أي تخطٍّ أو خطأ في التقرير وسجل التشغيل.

## 4) شكل المخرجات

| الملف | الوصف |
| --- | --- |
| `data/legal_issues/egypt_moj_issue_candidates.jsonl` | السجلات المسطّحة (سجل لكل عقدة) |
| `data/legal_issues/egypt_moj_issue_tree_seed.json` | الشجرة الهرمية (5 مستويات) |
| `data/legal_issues/egypt_moj_issue_candidates.csv` | نفس السجلات بصيغة CSV (اختياري) |
| `data/samples/egypt_moj_issue_tree_sample.jsonl` | عينة من أوائل السجلات |
| `data/legal_issues/egypt_moj_extraction_report.md` | تقرير تشغيل بشري القراءة |
| `data/legal_issues/egypt_moj_run_log.json` | سجل تشغيل تفصيلي (آلي) |

### مخطط سجل JSONL

```json
{
  "source": "Egyptian Legal Encyclopedia",
  "source_url": "...",
  "jurisdiction": "EG",
  "level": 2,
  "parent_title": "...",
  "node_title": "...",
  "normalized_title": "...",
  "node_type": "...",
  "branch": "...",
  "suggested_saudi_domain": "...",
  "suggested_hakeem_issue_path": "...",
  "mapping_type": "structural_seed",
  "confidence": 0.75,
  "needs_human_review": true,
  "evidence": { "url": "...", "selector": "h1/h2/menu/link", "text_snippet": "..." }
}
```

### مستويات الشجرة

- **Level 0** = المصدر / الموسوعة القانونية المصرية.
- **Level 1** = الفرع الأكبر (التشريعات، الأحكام، النيابة، الجنائي، المدني، القاموس).
- **Level 2** = القسم (الدفوع، الحيثيات، القيود والأوصاف، المواعيد، فتاوى، أحكام...).
- **Level 3** = المسألة القانونية المرشحة.
- **Level 4** = الصياغات أو المرادفات أو المسارات الفرعية إن وجدت.

### قيم `node_type`

`encyclopedia_root`, `encyclopedia_branch`, `legislation_category`,
`judgment_category`, `prosecution_category`, `civil_issue`, `criminal_issue`,
`defense_issue`, `procedural_issue`, `reasoning_template`, `legal_deadline`,
`criminal_classification`, `family_issue`, `labor_issue`, `inheritance_issue`,
`real_estate_documentation`, `administrative_issue`, `legal_dictionary`,
`unknown`.

### درجات الثقة `confidence`

- `0.90`: عنوان واضح ومباشر (مثل "الدفوع المدنية" أو "المواعيد القانونية").
- `0.75`: من فرع واضح لكن العنوان عام.
- `0.60`: تصنيف مستنتج.
- `0.50`: غير واضح.

## 5) استخدام الشجرة كبذرة في حكيم

1. حمّل `egypt_moj_issue_candidates.jsonl` كطبقة **اقتراحات** منفصلة (staging)،
   وليس كمصدر حقيقة.
2. راجع كل عقدة بشريًا: تحقّق من `suggested_saudi_domain` و
   `suggested_hakeem_issue_path`، وعدّلها وفق التصنيف السعودي المعتمد.
3. بعد المراجعة، حوّل العقد المقبولة إلى مسائل Hakeem الفعلية ضمن العملية
   الرسمية لإدخال المسائل (خارج نطاق هذه الأداة).
4. استخدم `confidence` و`needs_human_review` لترتيب أولويات المراجعة.

## 6) الفرق بين الشجرة المصرية والمواءمة السعودية

- **الشجرة المصرية** (`node_title`, `branch`, `level`, `evidence`) تمثّل بنية
  المصدر المصري كما هي — مرجع وصفي.
- **المواءمة السعودية** (`suggested_saudi_domain`, `suggested_hakeem_issue_path`)
  هي **اقتراح آلي تقريبي** يربط المفهوم المصري بأقرب مجال/مسار سعودي وفق قواعد
  مبسّطة، وقد يكون خاطئًا أو ناقصًا.
- لذلك `needs_human_review = true` **دائمًا** في هذه المرحلة: الفقه والإجراءات
  المصرية تختلف عن النظام السعودي، والمواءمة النهائية مسؤولية بشرية مختصّة.

> النتائج **بذرة هيكلية وليست قانونًا سعوديًا معتمدًا**.
