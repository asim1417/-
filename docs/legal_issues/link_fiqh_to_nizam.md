# مُطابِق المسائل الفقهية بمواد الأنظمة السعودية (Linker)

طبقة ربط **جاهزة للوصل** بقاعدة بيانات حكيم: تربط كل مسألة في شجرة المسائل
الفقهية (3073 مسألة) بـ**معرّف المادة الحقيقي (`article_id`)** في أنظمتكم، بدل
الروابط الرسمية أو «يُحدَّد بالمراجعة».

> لماذا؟ لأن الأنظمة وموادها موجودة في قاعدة بياناتكم (مستودع `hakeem-platform`)،
> فالربط الصحيح يكون بمفتاح أجنبي على سجلاتكم، لا بمواقع خارجية.

## المدخلات
1. شجرة المسائل: `data/legal_issues/fiqh_issue_candidates.jsonl` (مُولّدة).
2. **تصدير الأنظمة من حكيم**: ملف `saudi_systems.json` بالسكيمة الموثّقة في
   `config/legal_issues/saudi_systems.schema.json`:
   - `systems[]`: `{id, name, url?, issued?}`
   - `articles[]`: `{id, system_id, nizam, chapter, number, title?, text?, keywords?[]}`

## التشغيل
```bash
# جرّب على العيّنة (يثبت أن الربط يعمل بلا قاعدة بيانات):
python scripts/legal_issues/link_fiqh_to_nizam.py \
  --systems data/samples/saudi_systems_sample.json

# مع تصديركم الحقيقي:
python scripts/legal_issues/link_fiqh_to_nizam.py \
  --issues  data/legal_issues/fiqh_issue_candidates.jsonl \
  --systems <مسار تصدير أنظمة حكيم>.json \
  --out     data/legal_issues/fiqh_issue_linked.jsonl \
  --report  data/legal_issues/fiqh_link_report.md
```

## آلية المطابقة
1. **حدّ النظام**: لا تُربط مسألة إلا بمواد نظامها (تطابق اسم النظام، يدعم الأسماء
   المركّبة مثل «الشركات / المعاملات المدنية»).
2. **تداخل الكلمات**: تقاطع كلمات (الكتاب + الباب الفقهي + عنوان المسألة) مع
   (`chapter` + `title` + `keywords`) للمادة، بعد تطبيع عربي وإسقاط الكلمات
   البنيوية الشائعة.
3. أعلى المرشّحين (`--top-k`) مع `score`، وتصنيف `link_status`:
   - `linked` (score ≥ 2) · `needs_review` (مرشّح أضعف) · `unmatched` · `not_applicable`.

## المخرجات
- `fiqh_issue_linked.jsonl` — المسائل + حقل `linked_articles: [{article_id, number,
  nizam, chapter, score}]` + `link_status`.
- `fiqh_link_report.md` — نسبة التغطية والمطابقة حسب النظام.

كل السجلات تبقى `needs_human_review = true`؛ هذا ربط آلي مبدئي يراجعه المختص.

## كيف تُكمل الربط بقاعدة حكيم
1. افتح جلسة Claude Code على مستودع **`hakeem-platform`** (هذه الجلسة مقصورة على
   `asim1417/-`).
2. صدّر جدولَي الأنظمة/المواد إلى `saudi_systems.json` (أو سأقرأهما من الجداول
   مباشرة هناك).
3. شغّل المُطابِق → تحصل على كل مسألة مربوطة بـ`article_id` حقيقي جاهز للإدراج في
   جدول الربط (fiqh_issue ⇄ nizam_article).
