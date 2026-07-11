// ═══════════════════════════════════════════════════════════════════
//  منهج «مِفتاح الطب» — مصدر الحقيقة الواحد (Single Source of Truth)
//  يستخدمه: prisma/seed.ts (لملء قاعدة البيانات) وصفحات الواجهة (للعرض).
//  المحتوى شرح أصلي مع إحالة للمصادر المفتوحة (OpenStax CC BY, MedlinePlus, ...).
// ═══════════════════════════════════════════════════════════════════

export type Key = { index: number; en: string; ar: string; summary: string };
export type Term = { en: string; ar: string; root?: string; meaning: string };
export type Option = { label: string; text: string; correct?: boolean; whyWrong?: string };
export type Question = {
  id: string; subject: string; type: string; difficulty: number; highYield?: boolean;
  stem: string; options: Option[]; whyCorrect: string; conceptSlug?: string; sourceRef?: string;
};
export type Flashcard = { front: string; back: string };
export type Lesson = {
  slug: string; courseSlug: string; title: string; titleEn: string; order: number; highYield?: boolean;
  whyItMatters: string; bigIdea: string; explanationAr: string; clinical: string;
  highYieldPoints: string[]; commonMistakes: string[]; summary60: string;
  terms: Term[]; map: { title: string; nodes: string[] };
  flashcards: Flashcard[]; questionIds: string[]; conceptSlugs: string[]; sources: string[];
};
export type Course = { slug: string; title: string; titleAr: string; icon: string; order: number };

// ─────────────────────────── المسارات الـ17 ───────────────────────────
export const COURSES: Course[] = [
  { slug: "medical-thinking", title: "Medical Thinking", titleAr: "مدخل والتفكير الطبي", icon: "🧠", order: 1 },
  { slug: "terminology", title: "Medical Terminology", titleAr: "المصطلحات الطبية", icon: "🔤", order: 2 },
  { slug: "anatomy", title: "General Anatomy", titleAr: "التشريح العام", icon: "🦴", order: 3 },
  { slug: "physiology", title: "General Physiology", titleAr: "الفسيولوجيا العامة", icon: "🧬", order: 4 },
  { slug: "cell-biology", title: "Cell Biology", titleAr: "بيولوجيا الخلية", icon: "🧫", order: 5 },
  { slug: "histology", title: "Histology", titleAr: "الأنسجة", icon: "🔬", order: 6 },
  { slug: "embryology", title: "Embryology", titleAr: "الأجنة", icon: "🌱", order: 7 },
  { slug: "biochemistry", title: "Biochemistry", titleAr: "الكيمياء الحيوية", icon: "🧪", order: 8 },
  { slug: "genetics", title: "Genetics", titleAr: "الوراثة", icon: "🧾", order: 9 },
  { slug: "immunology", title: "Basic Immunology", titleAr: "المناعة", icon: "🛡️", order: 10 },
  { slug: "pathology", title: "Intro to Pathology", titleAr: "علم الأمراض", icon: "🩺", order: 11 },
  { slug: "pharmacology", title: "Intro to Pharmacology", titleAr: "علم الأدوية", icon: "💊", order: 12 },
  { slug: "lab", title: "Lab Interpretation", titleAr: "قراءة التحاليل", icon: "📊", order: 13 },
  { slug: "ebm", title: "EBM Basics", titleAr: "الطب المبني على الدليل", icon: "📈", order: 14 },
  { slug: "ethics", title: "Professionalism & Ethics", titleAr: "الأخلاقيات والمهنية", icon: "⚖️", order: 15 },
  { slug: "study-skills", title: "Study Skills", titleAr: "مهارات الدراسة", icon: "📚", order: 16 },
  { slug: "exam-strategy", title: "Exam Strategy", titleAr: "استراتيجية الاختبار", icon: "🎯", order: 17 },
];

// ─────────────────────── مفاتيح الطب الـ16 ───────────────────────
export const KEYS: Key[] = [
  { index: 1, en: "Homeostasis is the mother concept", ar: "الاتزان الداخلي هو المفهوم الأم", summary: "كل عرض مرضي تقريبًا = خلل في اتزان داخلي. أتقنه تفهم منطق الفسيولوجيا كلها." },
  { index: 2, en: "Structure determines function", ar: "البنية تحدد الوظيفة", summary: "شكل العضو يفسّر عمله؛ من الشعيرة الرئوية الرقيقة إلى تفرّع الشجرة القصبية." },
  { index: 3, en: "Function explains symptoms", ar: "الوظيفة تفسّر الأعراض", summary: "حين تعرف الوظيفة الطبيعية، يصبح العرض المرضي نتيجة منطقية لخللها." },
  { index: 4, en: "Cells → tissues → organs → systems", ar: "من الخلية إلى الجهاز", summary: "التنظيم الهرمي للجسم يربط المجهري بالكلي." },
  { index: 5, en: "Electrolytes explain nerve, muscle & heart", ar: "الشوارد تشرح العصب والعضلة والقلب", summary: "الصوديوم والبوتاسيوم والكالسيوم مفاتيح الاستثارة الكهربائية." },
  { index: 6, en: "Blood is a moving tissue", ar: "الدم نسيج متحرك", summary: "خلايا + بلازما + وظائف نقل ودفاع وتخثّر." },
  { index: 7, en: "Enzymes explain metabolism", ar: "الإنزيمات تشرح الأيض", summary: "محفّزات حيوية تحدد سرعة التفاعلات ومساراتها." },
  { index: 8, en: "Hormones are messages", ar: "الهرمونات رسائل", summary: "إشارات كيميائية تنسّق بين أعضاء متباعدة." },
  { index: 9, en: "Inflammation is a defense system", ar: "الالتهاب نظام دفاع", summary: "استجابة منظّمة للإصابة قد تنقلب ضارة إن استمرت." },
  { index: 10, en: "Anatomy is geography", ar: "التشريح جغرافيا", summary: "الموقع والجوار يفسّران انتشار المرض ومسار العلاج." },
  { index: 11, en: "Physiology is logic", ar: "الفسيولوجيا منطق", summary: "أنظمة تحكّم وتغذية راجعة قابلة للاستنتاج لا للحفظ." },
  { index: 12, en: "Biochemistry is mechanism", ar: "الكيمياء الحيوية آلية", summary: "المسارات الجزيئية تفسّر «كيف» يحدث كل شيء." },
  { index: 13, en: "Histology is microscopic architecture", ar: "الأنسجة معمار مجهري", summary: "بنية النسيج تحت المجهر تكشف وظيفته." },
  { index: 14, en: "Embryology explains congenital anomalies", ar: "الأجنة تفسّر التشوهات الخلقية", summary: "أخطاء التكوّن الجنيني أصل كثير من العيوب الولادية." },
  { index: 15, en: "Medical terminology unlocks the language", ar: "المصطلحات تفكّ لغة الطب", summary: "الجذور والسوابق واللواحق تمنحك معنى آلاف الكلمات." },
  { index: 16, en: "Clinical cases make facts meaningful", ar: "الحالات السريرية تُحيي المعلومة", summary: "ربط كل مفهوم بحالة يجعله راسخًا وذا معنى." },
];

// ─────────────── الأسئلة: من البنك المُحقّق ───────────────
import { QUESTION_BANK } from "./questionBank";
export const QUESTIONS: Question[] = QUESTION_BANK;

// ─────────────────────────── الدروس ───────────────────────────
export const LESSONS: Lesson[] = [
  {
    slug: "resting-membrane-potential", courseSlug: "physiology",
    title: "جهد الراحة الغشائي ومضخة الصوديوم–البوتاسيوم",
    titleEn: "Resting Membrane Potential & Na⁺/K⁺ Pump", order: 8, highYield: true,
    whyItMatters: "لأنه المفتاح الذي يفتح لك العصب والعضلة والقلب دفعة واحدة؛ اضطراب الشوارد = اضطراب في كل هذه.",
    bigIdea: "تحافظ الخلية على فرق جهد بين داخلها وخارجها. مضخة تصرف طاقة (ATP) لتُبقي الصوديوم خارجًا والبوتاسيوم داخلًا، فينشأ استعداد كهربائي جاهز للانطلاق.",
    explanationAr: "غشاء الخلية شبه نفوذ، وتوزيع الأيونات على جانبيه غير متساوٍ. مضخة Na⁺/K⁺ تضخّ باستمرار 3 صوديوم للخارج مقابل 2 بوتاسيوم للداخل مستهلكةً ATP. ينتج عن ذلك تدرّج كهروكيميائي يجعل داخل الخلية سالبًا (≈ −70 mV)؛ هذا الاستعداد هو ما يُطلَق عند التنبيه ليصنع جهد الفعل.",
    clinical: "ارتفاع البوتاسيوم (Hyperkalemia) يغيّر جهد الراحة ويسبب اضطرابات قلبية خطيرة — هنا يظهر لماذا هذا الدرس ليس نظريًا.",
    highYieldPoints: ["المضخة: 3 Na⁺ للخارج مقابل 2 K⁺ للداخل", "جهد الراحة النموذجي ≈ −70 mV", "مضخة نشطة تستهلك ATP"],
    commonMistakes: ["الخلط بين الانتشار السلبي والنقل النشط", "الظن أن K⁺ يخرج والصوديوم يدخل (العكس)"],
    summary60: "غشاء + مضخة Na⁺/K⁺ تستهلك ATP ⇒ فرق جهد −70mV ⇒ استعداد لجهد الفعل ⇒ عصب وعضلة وقلب.",
    terms: [
      { en: "Depolarization", ar: "إزالة الاستقطاب", meaning: "ارتفاع الجهد نحو الصفر عند دخول الصوديوم." },
      { en: "Repolarization", ar: "إعادة الاستقطاب", meaning: "عودة الجهد للسالبية بخروج البوتاسيوم." },
      { en: "Threshold", ar: "العتبة", meaning: "الجهد اللازم لإطلاق جهد الفعل." },
      { en: "Electrochemical gradient", ar: "التدرّج الكهروكيميائي", meaning: "محصّلة فرقي التركيز والشحنة." },
    ],
    map: { title: "من الغشاء إلى نبض القلب", nodes: ["Cell membrane", "Na⁺/K⁺ pump", "Ion gradient", "Resting potential", "Action potential", "Nerve · Muscle · Heart"] },
    flashcards: [
      { front: "Resting potential — القيمة النموذجية؟", back: "≈ −70 mV، ينشأ من فرق تركيز تحافظ عليه مضخة Na⁺/K⁺." },
      { front: "نسبة ضخّ مضخة Na⁺/K⁺؟", back: "3 Na⁺ للخارج : 2 K⁺ للداخل، باستهلاك ATP." },
    ],
    questionIds: ["q-nakpump", "q-hyperkalemia"], conceptSlugs: ["key-5"],
    sources: ["openstax-ap-membrane", "medlineplus-potassium"],
  },
  {
    slug: "homeostasis", courseSlug: "physiology",
    title: "الاتزان الداخلي: المفهوم الأم",
    titleEn: "Homeostasis: The Mother Concept", order: 1, highYield: true,
    whyItMatters: "لأن معظم الأمراض ما هي إلا خلل في اتزان داخلي؛ إتقانه يفتح لك منطق الفسيولوجيا كلها.",
    bigIdea: "يحافظ الجسم على بيئته الداخلية ثابتة نسبيًا (حرارة، سوائل، شوارد، سكر) عبر حلقات تحكّم ذاتية.",
    explanationAr: "كل حلقة اتزان تتكوّن من مستشعر يرصد التغيّر، ومركز تحكّم يقارنه بنقطة الضبط، ومُنفّذ يعيد المتغيّر إلى مداه. الغالب هو التغذية الراجعة السلبية التي تعاكس التغيّر، بينما التغذية الإيجابية (كالولادة والتخثّر) تضخّم الحدث حتى ينتهي.",
    clinical: "الحمّى، الجفاف، واضطراب السكر كلها أمثلة على انزياح نقطة الاتزان — تشخيصها يبدأ من فهم الحلقة الطبيعية.",
    highYieldPoints: ["مكوّنات الحلقة: مستشعر ← مركز ← منفّذ", "السلبية تعاكس التغيّر، الإيجابية تضخّمه", "نقطة الضبط (set point) مرجع النظام"],
    commonMistakes: ["اعتبار كل تغذية راجعة سلبية", "الخلط بين نقطة الضبط والقيمة اللحظية"],
    summary60: "بيئة داخلية ثابتة عبر حلقات (مستشعر←مركز←منفّذ)؛ الغالب سالب يعاكس التغيّر.",
    terms: [
      { en: "Set point", ar: "نقطة الضبط", meaning: "القيمة المرجعية التي يحافظ النظام عليها." },
      { en: "Negative feedback", ar: "تغذية راجعة سلبية", meaning: "استجابة تعاكس التغيّر وتعيد الاتزان." },
      { en: "Positive feedback", ar: "تغذية راجعة إيجابية", meaning: "استجابة تضخّم الحدث حتى نهايته." },
    ],
    map: { title: "حلقة الاتزان", nodes: ["Stimulus", "Sensor", "Control center", "Effector", "Set point restored"] },
    flashcards: [
      { front: "مكوّنات حلقة التغذية الراجعة؟", back: "مستشعر (receptor) ← مركز تحكّم (control center) ← منفّذ (effector)." },
      { front: "مثال للتغذية الراجعة الإيجابية؟", back: "تقلّصات الولادة، وتسلسل التخثّر، وإطلاق الحليب." },
    ],
    questionIds: ["q-homeostasis"], conceptSlugs: ["key-1"],
    sources: ["openstax-ap-homeostasis"],
  },
  {
    slug: "cell-hierarchy", courseSlug: "cell-biology",
    title: "من الخلية إلى الجهاز: مستويات التنظيم",
    titleEn: "From Cells to Systems", order: 2,
    whyItMatters: "لأن ربط المجهري بالكلي هو ما يحوّل الحفظ المبعثر إلى فهم متصل.",
    bigIdea: "الخلية وحدة البناء الأساسية؛ تتجمّع خلايا متشابهة لتكوّن نسيجًا، ثم أعضاء، ثم أجهزة تتكامل في الكائن الحي.",
    explanationAr: "الأنسجة الأربعة الأساسية (ظهاري، ضام، عضلي، عصبي) تتجمّع بأنماط محددة لتصنع أعضاء ذات وظائف. فهم هذا التدرّج يفسّر لماذا يؤثّر خلل خلوي دقيق في وظيفة عضو كامل.",
    clinical: "الأورام تبدأ من خلل خلوي مفرد ثم تنتشر عبر النسيج والعضو — التدرّج نفسه يفسّر التدرّج المرضي.",
    highYieldPoints: ["الأنسجة الأربعة: ظهاري، ضام، عضلي، عصبي", "الخلية أصغر وحدة حيّة", "التكامل بين الأجهزة يصنع الاتزان"],
    commonMistakes: ["الخلط بين النسيج والعضو", "إهمال النسيج الضام كنسيج داعم رئيس"],
    summary60: "خلية ← نسيج ← عضو ← جهاز؛ أربعة أنسجة أساسية تبني كل شيء.",
    terms: [
      { en: "Epithelial tissue", ar: "نسيج ظهاري", meaning: "يبطّن الأسطح والتجاويف ويؤدي الإفراز والحماية." },
      { en: "Connective tissue", ar: "نسيج ضام", meaning: "يدعم ويربط، ويشمل الدم والعظم." },
    ],
    map: { title: "التدرّج البنائي", nodes: ["Cell", "Tissue", "Organ", "Organ system", "Organism"] },
    flashcards: [
      { front: "الأنسجة الأساسية الأربعة؟", back: "ظهاري، ضام، عضلي، عصبي." },
      { front: "أصغر وحدة حيّة في الجسم؟", back: "الخلية (Cell)." },
    ],
    questionIds: ["q-cellhierarchy"], conceptSlugs: ["key-4"],
    sources: ["openstax-ap-cell"],
  },
];

// ─────────────── مصادر مفتوحة مرجعية (للبذور والاستشهاد) ───────────────
export const SOURCE_SEEDS = [
  { provider: "openstax", externalId: "openstax-ap-membrane", title: "OpenStax Anatomy & Physiology — The Cell Membrane", url: "https://openstax.org/books/anatomy-and-physiology-2e/pages/3-1-the-cell-membrane", license: "CC BY 4.0" },
  { provider: "openstax", externalId: "openstax-ap-homeostasis", title: "OpenStax Anatomy & Physiology — Homeostasis", url: "https://openstax.org/books/anatomy-and-physiology-2e/pages/1-5-homeostasis", license: "CC BY 4.0" },
  { provider: "openstax", externalId: "openstax-ap-cell", title: "OpenStax Anatomy & Physiology — The Cell", url: "https://openstax.org/books/anatomy-and-physiology-2e/pages/3-introduction", license: "CC BY 4.0" },
  { provider: "openstax", externalId: "openstax-ap-enzyme", title: "OpenStax Anatomy & Physiology — Enzymes", url: "https://openstax.org/books/anatomy-and-physiology-2e/pages/2-4-inorganic-compounds", license: "CC BY 4.0" },
  { provider: "medlineplus", externalId: "medlineplus-potassium", title: "MedlinePlus — Potassium Blood Test", url: "https://medlineplus.gov/lab-tests/potassium-blood-test/", license: "Public Domain (US Gov)" },
];
