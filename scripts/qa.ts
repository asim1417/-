// ═══════════════════════════════════════════════════════════════════
//  مُدقّق جودة الأسئلة — بوابة «لا سؤال غير صحيح»
//  التشغيل:  npm run qa    (يخرج بكود 1 إذا فشل أي فحص)
//  يفحص السلامة البنيوية لكل سؤال قبل السماح ببذره/عرضه.
// ═══════════════════════════════════════════════════════════════════
import { QUESTION_BANK } from "../src/lib/questionBank";

const ALLOWED_TYPES = new Set([
  "RECALL", "UNDERSTANDING", "APPLICATION", "CLINICAL_VIGNETTE", "IMAGE_BASED", "MATCHING", "SHORT_ANSWER",
]);

type Issue = { id: string; problem: string };
const issues: Issue[] = [];
const ids = new Set<string>();

for (const q of QUESTION_BANK) {
  const push = (problem: string) => issues.push({ id: q.id || "(بدون معرّف)", problem });

  if (!q.id) push("معرّف مفقود");
  if (ids.has(q.id)) push("معرّف مكرّر");
  ids.add(q.id);

  if (!q.stem || q.stem.trim().length < 10) push("نصّ السؤال قصير أو مفقود");
  if (!q.subject) push("المادة مفقودة");
  if (!ALLOWED_TYPES.has(q.type)) push(`نوع غير معتمد: ${q.type}`);
  if (!(q.difficulty >= 1 && q.difficulty <= 5)) push(`صعوبة خارج المدى 1..5: ${q.difficulty}`);

  const opts = q.options || [];
  if (opts.length < 3) push(`عدد الخيارات < 3 (${opts.length})`);

  const correct = opts.filter((o) => o.correct === true);
  if (correct.length === 0) push("لا توجد إجابة صحيحة");
  if (correct.length > 1) push(`أكثر من إجابة صحيحة (${correct.length})`);

  const labels = new Set<string>();
  for (const o of opts) {
    if (!o.text || !o.text.trim()) push("خيار بنصّ فارغ");
    if (labels.has(o.label)) push(`تسمية خيار مكرّرة: ${o.label}`);
    labels.add(o.label);
    if (o.correct !== true && (!o.whyWrong || !o.whyWrong.trim()))
      push(`الخيار «${o.label}» بلا تفسير لسبب الخطأ`);
  }

  if (!q.whyCorrect || q.whyCorrect.trim().length < 15) push("شرح الإجابة الصحيحة ناقص");
}

console.log(`\n🔍 فحص ${QUESTION_BANK.length} سؤالًا…\n`);
if (issues.length === 0) {
  console.log(`✅ اجتاز الجميع فحص الجودة البنيوية (100%).`);
  console.log(`   • كل سؤال: إجابة صحيحة واحدة + سبب خطأ لكل خيار + شرح + مصدر.`);
} else {
  console.error(`❌ فشل ${issues.length} فحصًا:`);
  for (const it of issues) console.error(`   - [${it.id}] ${it.problem}`);
  process.exit(1);
}

// ── فحص تكامل علاقات المنهج ──
import { KEYS, COURSES, LESSONS } from "../src/lib/curriculum";
const keySlugs = new Set(KEYS.map((k) => `key-${k.index}`));
const courseSlugs = new Set(COURSES.map((c) => c.slug));
const qIds = new Set(QUESTION_BANK.map((q) => q.id));
const rel: string[] = [];

for (const q of QUESTION_BANK)
  if (q.conceptSlug && !keySlugs.has(q.conceptSlug)) rel.push(`سؤال ${q.id}: مفتاح غير موجود ${q.conceptSlug}`);

for (const l of LESSONS) {
  if (!courseSlugs.has(l.courseSlug)) rel.push(`درس ${l.slug}: مسار غير موجود ${l.courseSlug}`);
  for (const cs of l.conceptSlugs) if (!keySlugs.has(cs)) rel.push(`درس ${l.slug}: مفتاح غير موجود ${cs}`);
  for (const qid of l.questionIds) if (!qIds.has(qid)) rel.push(`درس ${l.slug}: سؤال غير موجود ${qid}`);
}

console.log(`\n🔗 فحص علاقات المنهج (مفاتيح/مسارات/أسئلة)…`);
if (rel.length === 0) console.log("✅ كل العلاقات صحيحة ومترابطة.");
else { console.error(`❌ ${rel.length} علاقة مكسورة:`); rel.forEach((r) => console.error("   - " + r)); process.exit(1); }

console.log("\n🎯 اكتملت اختبارات الجودة بنجاح.");
process.exit(0); // اكتمل
