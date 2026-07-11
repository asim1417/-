// ═══════════════════════════════════════════════════════════════════
//  بنك أسئلة «مِفتاح الطب» — محتوى تأسيسي مُحقّق
//  المبدأ: كل سؤال يعتمد حقيقة علمية قطعية غير خلافية من مراجع الطب
//  التأسيسي (OpenStax A&P, Guyton basics, MedlinePlus). لا أسئلة إدارة
//  سريرية أو جرعات أو حالات خلافية. كل سؤال يمرّ بمدقّق QA + مراجعة بشرية
//  قبل عرضه للطالب (status = pending حتى الاعتماد).
// ═══════════════════════════════════════════════════════════════════
import type { Question } from "./curriculum";

export const QUESTION_BANK: Question[] = [
  // ── فسيولوجيا: الغشاء والجهد ──
  {
    id: "q-nakpump", subject: "Physiology", type: "APPLICATION", difficulty: 3, highYield: true,
    conceptSlug: "key-5", sourceRef: "openstax-ap-membrane",
    stem: "تعمل مضخة الصوديوم–البوتاسيوم عبر غشاء الخلية. أيّ العبارات صحيحة؟",
    options: [
      { label: "أ", text: "تنقل Na⁺ إلى الداخل و K⁺ إلى الخارج", whyWrong: "عكست الاتجاه الصحيح للمضخة." },
      { label: "ب", text: "تُخرج 3 Na⁺ وتُدخل 2 K⁺ مستهلكةً ATP", correct: true },
      { label: "ج", text: "تعمل بالانتشار السلبي دون طاقة", whyWrong: "المضخة نقل نشط يستهلك ATP، لا انتشار سلبي." },
      { label: "د", text: "لا علاقة لها بجهد الراحة الغشائي", whyWrong: "هي أساس تكوّن جهد الراحة." },
    ],
    whyCorrect: "المضخة نقل نشط يستهلك ATP، تُخرج 3 صوديوم مقابل إدخال 2 بوتاسيوم، فتُنشئ الفرق الأيوني المسؤول عن جهد الراحة (≈ −70 mV).",
  },
  {
    id: "q-ap-depol", subject: "Physiology", type: "UNDERSTANDING", difficulty: 3, highYield: true,
    conceptSlug: "key-5", sourceRef: "openstax-ap-membrane",
    stem: "ما سبب مرحلة إزالة الاستقطاب (Depolarization) في جهد الفعل؟",
    options: [
      { label: "أ", text: "تدفّق الصوديوم Na⁺ إلى داخل الخلية", correct: true },
      { label: "ب", text: "خروج البوتاسيوم K⁺ من الخلية", whyWrong: "خروج البوتاسيوم مسؤول عن إعادة الاستقطاب لا إزالته." },
      { label: "ج", text: "توقّف كل الحركة الأيونية", whyWrong: "جهد الفعل يقوم أساسًا على حركة أيونية نشطة." },
      { label: "د", text: "دخول الكلور Cl⁻ فقط", whyWrong: "الكلور ليس المسؤول الرئيس عن إزالة الاستقطاب." },
    ],
    whyCorrect: "عند بلوغ العتبة تُفتح قنوات الصوديوم فيندفع Na⁺ إلى الداخل، فيرتفع الجهد نحو الموجب (إزالة الاستقطاب).",
  },
  {
    id: "q-hyperkalemia", subject: "Physiology", type: "CLINICAL_VIGNETTE", difficulty: 4, highYield: true,
    conceptSlug: "key-5", sourceRef: "medlineplus-potassium",
    stem: "مريض بارتفاع حاد في بوتاسيوم الدم. ما التفسير الفسيولوجي لخطورته على القلب؟",
    options: [
      { label: "أ", text: "يزيد إفراز الإنسولين فيهبط السكر", whyWrong: "غير مرتبط بالخطورة القلبية المباشرة." },
      { label: "ب", text: "يغيّر جهد الراحة فيختلّ استقرار خلايا القلب", correct: true },
      { label: "ج", text: "يرفع ضغط الدم فورًا عبر الكلى", whyWrong: "ليس الآلية المباشرة لاضطراب النظم." },
      { label: "د", text: "يكسر كريات الدم الحمراء", whyWrong: "لا علاقة مباشرة." },
    ],
    whyCorrect: "البوتاسيوم يحدد جهد الراحة؛ ارتفاعه يجعل الجهد أقل سالبية فيقلّل استقرار خلايا القلب ويسبب اضطرابات نظم خطيرة.",
  },

  // ── فسيولوجيا: الاتزان ──
  {
    id: "q-homeostasis", subject: "Physiology", type: "UNDERSTANDING", difficulty: 2, highYield: true,
    conceptSlug: "key-1", sourceRef: "openstax-ap-homeostasis",
    stem: "أيّ مثال يُجسّد آلية التغذية الراجعة السلبية (negative feedback)؟",
    options: [
      { label: "أ", text: "تنظيم درجة حرارة الجسم عند 37°م", correct: true },
      { label: "ب", text: "تضخّم موجة تقلّصات الولادة حتى الولادة", whyWrong: "هذا مثال للتغذية الراجعة الإيجابية." },
      { label: "ج", text: "تسلسل تجلّط الدم حتى إغلاق الجرح", whyWrong: "مثال للتغذية الراجعة الإيجابية." },
      { label: "د", text: "إطلاق الحليب عند الرضاعة", whyWrong: "منعكس إيجابي تقوده الأوكسيتوسين." },
    ],
    whyCorrect: "التغذية الراجعة السلبية تعيد المتغيّر إلى نقطة الضبط؛ تنظيم الحرارة نموذج كلاسيكي لها.",
  },
  {
    id: "q-glucose-insulin", subject: "Physiology", type: "RECALL", difficulty: 2, highYield: true,
    conceptSlug: "key-8", sourceRef: "medlineplus-glucose",
    stem: "أيّ هرمون يخفض مستوى سكر الدم؟",
    options: [
      { label: "أ", text: "الإنسولين", correct: true },
      { label: "ب", text: "الجلوكاجون", whyWrong: "الجلوكاجون يرفع سكر الدم لا يخفضه." },
      { label: "ج", text: "الأدرينالين", whyWrong: "الأدرينالين يرفع سكر الدم." },
      { label: "د", text: "الكورتيزول", whyWrong: "الكورتيزول يميل لرفع سكر الدم." },
    ],
    whyCorrect: "الإنسولين تفرزه خلايا بيتا في البنكرياس ويخفض سكر الدم بتعزيز دخول الجلوكوز إلى الخلايا.",
  },
  {
    id: "q-blood-ph", subject: "Physiology", type: "RECALL", difficulty: 2,
    conceptSlug: "key-1", sourceRef: "openstax-ap-homeostasis",
    stem: "ما المدى الطبيعي لدرجة حموضة (pH) الدم الشرياني؟",
    options: [
      { label: "أ", text: "7.35 – 7.45", correct: true },
      { label: "ب", text: "6.0 – 6.5", whyWrong: "قيمة حمضية جدًا وغير متوافقة مع الحياة." },
      { label: "ج", text: "8.5 – 9.0", whyWrong: "قاعدية جدًا وغير فسيولوجية." },
      { label: "د", text: "5.0 – 5.5", whyWrong: "حمضية بشدّة." },
    ],
    whyCorrect: "الجسم يحافظ على pH الدم في مدى ضيّق 7.35–7.45، وأي انحراف كبير يهدد الوظائف الحيوية.",
  },

  // ── بيولوجيا الخلية ──
  {
    id: "q-mitochondria", subject: "Cell Biology", type: "RECALL", difficulty: 1, highYield: true,
    conceptSlug: "key-12", sourceRef: "openstax-ap-cell",
    stem: "أيّ عضيّة تُعدّ الموقع الرئيس لإنتاج الطاقة (ATP) في الخلية؟",
    options: [
      { label: "أ", text: "الميتوكوندريا", correct: true },
      { label: "ب", text: "الرايبوسوم", whyWrong: "الرايبوسوم موقع تصنيع البروتين لا إنتاج الطاقة." },
      { label: "ج", text: "جهاز جولجي", whyWrong: "جولجي يعدّل ويعبّئ ويوزّع البروتينات." },
      { label: "د", text: "الليسوسوم", whyWrong: "الليسوسوم مسؤول عن الهضم داخل الخلوي." },
    ],
    whyCorrect: "الميتوكوندريا موقع التنفّس الخلوي الهوائي وإنتاج معظم ATP الخلوي.",
  },
  {
    id: "q-ribosome", subject: "Cell Biology", type: "RECALL", difficulty: 1,
    conceptSlug: "key-12", sourceRef: "openstax-ap-cell",
    stem: "أين تُصنَّع البروتينات داخل الخلية؟",
    options: [
      { label: "أ", text: "الرايبوسوم", correct: true },
      { label: "ب", text: "النواة", whyWrong: "النواة تخزّن DNA وتتم فيها عملية النسخ لا تصنيع البروتين." },
      { label: "ج", text: "الليسوسوم", whyWrong: "الليسوسوم للهضم داخل الخلوي." },
      { label: "د", text: "الميتوكوندريا", whyWrong: "الميتوكوندريا لإنتاج الطاقة." },
    ],
    whyCorrect: "الرايبوسومات هي مواقع الترجمة (Translation) حيث تُبنى سلاسل البروتين من الأحماض الأمينية.",
  },
  {
    id: "q-nucleus", subject: "Cell Biology", type: "RECALL", difficulty: 1,
    conceptSlug: "key-4", sourceRef: "openstax-ap-cell",
    stem: "أيّ مكوّن خلوي يحوي المادة الوراثية (DNA) في الخلايا حقيقية النواة؟",
    options: [
      { label: "أ", text: "النواة", correct: true },
      { label: "ب", text: "السيتوبلازم", whyWrong: "السيتوبلازم وسط تحدث فيه تفاعلات، لكنه لا يحوي DNA النووي." },
      { label: "ج", text: "الغشاء الخلوي", whyWrong: "الغشاء يحدّد الخلية وينظّم النقل، لا يخزّن DNA." },
      { label: "د", text: "الرايبوسوم", whyWrong: "الرايبوسوم لتصنيع البروتين." },
    ],
    whyCorrect: "في الخلايا حقيقية النواة يُحفظ معظم DNA داخل النواة المحاطة بغشاء نووي.",
  },
  {
    id: "q-membrane-structure", subject: "Cell Biology", type: "RECALL", difficulty: 2,
    conceptSlug: "key-2", sourceRef: "openstax-ap-membrane",
    stem: "ما المكوّن البنيوي الأساسي لغشاء الخلية؟",
    options: [
      { label: "أ", text: "طبقة فوسفوليبيد مزدوجة", correct: true },
      { label: "ب", text: "جدار من السليولوز", whyWrong: "السليولوز مكوّن جدار الخلية النباتية لا غشاء الخلية الحيوانية." },
      { label: "ج", text: "شبكة من الكيراتين", whyWrong: "الكيراتين بروتين بنيوي في الجلد والشعر لا في الغشاء." },
      { label: "د", text: "ألياف الكولاجين", whyWrong: "الكولاجين بروتين للنسيج الضام خارج الخلوي." },
    ],
    whyCorrect: "الغشاء الخلوي طبقة فوسفوليبيد مزدوجة (نموذج الفسيفساء المائع) تتخللها بروتينات.",
  },
  {
    id: "q-cellhierarchy", subject: "Cell Biology", type: "RECALL", difficulty: 1,
    conceptSlug: "key-4", sourceRef: "openstax-ap-cell",
    stem: "رتّب مستويات التنظيم في الجسم من الأصغر إلى الأكبر.",
    options: [
      { label: "أ", text: "خلية ← نسيج ← عضو ← جهاز", correct: true },
      { label: "ب", text: "نسيج ← خلية ← جهاز ← عضو", whyWrong: "الخلية أصغر من النسيج." },
      { label: "ج", text: "عضو ← جهاز ← نسيج ← خلية", whyWrong: "الترتيب معكوس." },
      { label: "د", text: "جهاز ← عضو ← خلية ← نسيج", whyWrong: "الخلية تسبق النسيج." },
    ],
    whyCorrect: "التنظيم الهرمي: الخلية وحدة البناء، تجتمع لتكوّن نسيجًا، ثم عضوًا، ثم جهازًا.",
  },

  // ── النقل عبر الغشاء ──
  {
    id: "q-passive-transport", subject: "Physiology", type: "UNDERSTANDING", difficulty: 2,
    conceptSlug: "key-11", sourceRef: "openstax-ap-membrane",
    stem: "أيّ نوع نقل عبر الغشاء لا يتطلّب صرف طاقة (ATP)؟",
    options: [
      { label: "أ", text: "الانتشار البسيط (Simple diffusion)", correct: true },
      { label: "ب", text: "مضخة الصوديوم–البوتاسيوم", whyWrong: "نقل نشط أولي يستهلك ATP." },
      { label: "ج", text: "الإخراج الخلوي (Exocytosis)", whyWrong: "عملية نشطة تحتاج طاقة." },
      { label: "د", text: "النقل النشط الثانوي", whyWrong: "يعتمد على تدرّج تصنعه مضخة تستهلك طاقة." },
    ],
    whyCorrect: "الانتشار البسيط يسير مع تدرّج التركيز دون طاقة، بخلاف النقل النشط الذي يحتاج ATP.",
  },
  {
    id: "q-osmosis", subject: "Physiology", type: "RECALL", difficulty: 2,
    conceptSlug: "key-11", sourceRef: "openstax-ap-membrane",
    stem: "الأسموزية (Osmosis) هي انتقال أيّ مادة عبر غشاء شبه نفوذ؟",
    options: [
      { label: "أ", text: "الماء", correct: true },
      { label: "ب", text: "الصوديوم بالنقل النشط", whyWrong: "هذا نقل نشط للأيونات لا أسموزية." },
      { label: "ج", text: "البروتينات الكبيرة", whyWrong: "لا تعبر بالأسموزية." },
      { label: "د", text: "الجلوكوز بمضخة", whyWrong: "نقل الجلوكوز النشط مختلف عن الأسموزية." },
    ],
    whyCorrect: "الأسموزية هي انتقال الماء عبر غشاء شبه نفوذ من التركيز الأقل للمذاب إلى الأعلى.",
  },

  // ── الأنسجة ──
  {
    id: "q-four-tissues", subject: "Histology", type: "RECALL", difficulty: 1, highYield: true,
    conceptSlug: "key-13", sourceRef: "openstax-ap-cell",
    stem: "ما الأنسجة الأساسية الأربعة في جسم الإنسان؟",
    options: [
      { label: "أ", text: "الظهاري، الضام، العضلي، العصبي", correct: true },
      { label: "ب", text: "الظهاري، الدموي، العظمي، الجلدي", whyWrong: "الدم والعظم نوعان من النسيج الضام، والجلد عضو لا نسيج أساسي." },
      { label: "ج", text: "العضلي، العصبي، الغضروفي، الدهني", whyWrong: "الغضروف والدهن أنواع من الضام لا أنسجة أساسية مستقلة." },
      { label: "د", text: "الضام، العصبي، الليمفي، الوعائي", whyWrong: "الليمفي والوعائي ليسا من التصنيف الأساسي الرباعي." },
    ],
    whyCorrect: "التصنيف النسيجي الأساسي أربعة: ظهاري، ضام (ومنه الدم والعظم)، عضلي، عصبي.",
  },
  {
    id: "q-epithelium", subject: "Histology", type: "UNDERSTANDING", difficulty: 2,
    conceptSlug: "key-2", sourceRef: "openstax-ap-cell",
    stem: "ما الوظيفة الأساسية للنسيج الظهاري (Epithelial tissue)؟",
    options: [
      { label: "أ", text: "تبطين الأسطح والتجاويف والحماية والإفراز", correct: true },
      { label: "ب", text: "نقل السيالات العصبية", whyWrong: "هذه وظيفة النسيج العصبي." },
      { label: "ج", text: "توليد الحركة بالتقلّص", whyWrong: "هذه وظيفة النسيج العضلي." },
      { label: "د", text: "الربط والدعم بين الأعضاء", whyWrong: "هذه وظيفة النسيج الضام." },
    ],
    whyCorrect: "النسيج الظهاري يغطّي الأسطح ويبطّن التجاويف والأوعية ويؤدّي الحماية والإفراز والامتصاص.",
  },

  // ── الكيمياء الحيوية ──
  {
    id: "q-enzyme", subject: "Biochemistry", type: "UNDERSTANDING", difficulty: 2, highYield: true,
    conceptSlug: "key-7", sourceRef: "openstax-ap-enzyme",
    stem: "ما الدور الأساسي للإنزيم في التفاعل الأيضي؟",
    options: [
      { label: "أ", text: "يخفض طاقة التنشيط فيسرّع التفاعل", correct: true },
      { label: "ب", text: "يغيّر اتجاه التفاعل عكس الديناميكا الحرارية", whyWrong: "الإنزيم لا يخالف الاتزان الحراري الديناميكي." },
      { label: "ج", text: "يُستهلك نهائيًا في التفاعل", whyWrong: "الإنزيم محفّز لا يُستهلك." },
      { label: "د", text: "يرفع طاقة التنشيط لتنظيم السرعة", whyWrong: "يخفضها لا يرفعها." },
    ],
    whyCorrect: "الإنزيم محفّز حيوي يخفض طاقة التنشيط دون أن يُستهلك، فيسرّع التفاعل الأيضي.",
  },
  {
    id: "q-protein-unit", subject: "Biochemistry", type: "RECALL", difficulty: 1, highYield: true,
    conceptSlug: "key-12", sourceRef: "openstax-ap-enzyme",
    stem: "ما وحدة البناء الأساسية للبروتينات؟",
    options: [
      { label: "أ", text: "الأحماض الأمينية", correct: true },
      { label: "ب", text: "الأحماض الدهنية", whyWrong: "وحدة بناء الدهون لا البروتين." },
      { label: "ج", text: "الجلوكوز", whyWrong: "وحدة بناء الكربوهيدرات." },
      { label: "د", text: "النيوكليوتيدات", whyWrong: "وحدة بناء الأحماض النووية (DNA/RNA)." },
    ],
    whyCorrect: "تتكوّن البروتينات من سلاسل أحماض أمينية مرتبطة بروابط ببتيدية.",
  },
  {
    id: "q-dna-pairing", subject: "Biochemistry", type: "RECALL", difficulty: 2, highYield: true,
    conceptSlug: "key-12", sourceRef: "medlineplus-genetics",
    stem: "في جزيء DNA، يقترن الأدينين (A) مع أيّ قاعدة؟",
    options: [
      { label: "أ", text: "الثايمين (T)", correct: true },
      { label: "ب", text: "الجوانين (G)", whyWrong: "الجوانين يقترن مع السيتوسين." },
      { label: "ج", text: "السيتوسين (C)", whyWrong: "السيتوسين يقترن مع الجوانين." },
      { label: "د", text: "اليوراسيل (U)", whyWrong: "اليوراسيل يظهر في RNA لا DNA." },
    ],
    whyCorrect: "قاعدة الاقتران التكميلي في DNA: A مع T، و G مع C.",
  },
  {
    id: "q-central-dogma", subject: "Genetics", type: "UNDERSTANDING", difficulty: 2, highYield: true,
    conceptSlug: "key-12", sourceRef: "medlineplus-genetics",
    stem: "ما الترتيب الصحيح لتدفّق المعلومات الوراثية (العقيدة المركزية)؟",
    options: [
      { label: "أ", text: "DNA ← RNA ← بروتين", correct: true },
      { label: "ب", text: "بروتين ← RNA ← DNA", whyWrong: "اتجاه معكوس للعقيدة المركزية الأساسية." },
      { label: "ج", text: "RNA ← DNA ← بروتين", whyWrong: "البداية من DNA لا RNA في المسار الأساسي." },
      { label: "د", text: "DNA ← بروتين ← RNA", whyWrong: "البروتين ناتج نهائي لا وسيط." },
    ],
    whyCorrect: "المعلومة تُنسخ من DNA إلى RNA (نسخ) ثم تُترجم إلى بروتين (ترجمة).",
  },

  // ── الوراثة ──
  {
    id: "q-chromosomes", subject: "Genetics", type: "RECALL", difficulty: 1, highYield: true,
    conceptSlug: "key-14", sourceRef: "medlineplus-genetics",
    stem: "كم عدد الكروموسومات في الخلية الجسدية البشرية الطبيعية؟",
    options: [
      { label: "أ", text: "46 كروموسومًا (23 زوجًا)", correct: true },
      { label: "ب", text: "23 كروموسومًا", whyWrong: "هذا عدد الكروموسومات في المشيج (الخلية الجنسية)." },
      { label: "ج", text: "48 كروموسومًا", whyWrong: "عدد غير صحيح للإنسان." },
      { label: "د", text: "44 كروموسومًا", whyWrong: "يهمل الكروموسومات الجنسية." },
    ],
    whyCorrect: "الخلية الجسدية البشرية تحوي 46 كروموسومًا في 23 زوجًا (22 جسميًا + زوج جنسي).",
  },
  {
    id: "q-meiosis", subject: "Genetics", type: "UNDERSTANDING", difficulty: 2,
    conceptSlug: "key-14", sourceRef: "openstax-ap-cell",
    stem: "أيّ نوع من الانقسام الخلوي ينتج الأمشاج (الحيوانات المنوية والبويضات)؟",
    options: [
      { label: "أ", text: "الانقسام المنصّف (Meiosis)", correct: true },
      { label: "ب", text: "الانقسام المتساوي (Mitosis)", whyWrong: "المتساوي ينتج خلايا جسدية مطابقة لا أمشاجًا." },
      { label: "ج", text: "الانشطار الثنائي", whyWrong: "خاص ببدائيات النوى كالبكتيريا." },
      { label: "د", text: "التبرعم", whyWrong: "تكاثر لا جنسي في كائنات أخرى." },
    ],
    whyCorrect: "الانقسام المنصّف يقلّل العدد الصبغي للنصف فينتج أمشاجًا أحادية الصيغة (n).",
  },

  // ── الدم ──
  {
    id: "q-rbc", subject: "Physiology", type: "RECALL", difficulty: 1, highYield: true,
    conceptSlug: "key-6", sourceRef: "medlineplus-blood",
    stem: "ما الوظيفة الرئيسية لكريات الدم الحمراء؟",
    options: [
      { label: "أ", text: "نقل الأكسجين عبر الهيموغلوبين", correct: true },
      { label: "ب", text: "تخثّر الدم", whyWrong: "هذه وظيفة الصفائح الدموية." },
      { label: "ج", text: "مكافحة العدوى", whyWrong: "هذه وظيفة كريات الدم البيضاء." },
      { label: "د", text: "إنتاج الأجسام المضادة", whyWrong: "هذه وظيفة الخلايا البائية." },
    ],
    whyCorrect: "كريات الدم الحمراء تحمل الأكسجين مرتبطًا بالهيموغلوبين من الرئتين إلى الأنسجة.",
  },
  {
    id: "q-platelets", subject: "Physiology", type: "RECALL", difficulty: 1,
    conceptSlug: "key-6", sourceRef: "medlineplus-blood",
    stem: "أيّ مكوّن دموي يلعب الدور الأساسي في تخثّر الدم؟",
    options: [
      { label: "أ", text: "الصفائح الدموية", correct: true },
      { label: "ب", text: "كريات الدم الحمراء", whyWrong: "مهمتها نقل الأكسجين لا التخثّر." },
      { label: "ج", text: "الخلايا اللمفاوية", whyWrong: "دورها مناعي تكيّفي." },
      { label: "د", text: "البلازما وحدها", whyWrong: "البلازما تحوي عوامل تخثّر، لكن الصفائح هي الخلايا المبادِرة." },
    ],
    whyCorrect: "الصفائح الدموية تتجمّع عند الإصابة وتبدأ سلسلة التخثّر لإيقاف النزف.",
  },
  {
    id: "q-wbc", subject: "Immunology", type: "RECALL", difficulty: 1,
    conceptSlug: "key-9", sourceRef: "medlineplus-blood",
    stem: "ما الوظيفة الأساسية لكريات الدم البيضاء؟",
    options: [
      { label: "أ", text: "الدفاع المناعي ضد العدوى", correct: true },
      { label: "ب", text: "نقل ثاني أكسيد الكربون", whyWrong: "نقل الغازات وظيفة الكريات الحمراء." },
      { label: "ج", text: "تكوين الجلطة", whyWrong: "التخثّر وظيفة الصفائح." },
      { label: "د", text: "تنظيم سكر الدم", whyWrong: "ينظّمه هرمونا الإنسولين والجلوكاجون." },
    ],
    whyCorrect: "كريات الدم البيضاء هي خلايا الجهاز المناعي التي تكافح العدوى والأجسام الغريبة.",
  },

  // ── المناعة ──
  {
    id: "q-innate", subject: "Immunology", type: "UNDERSTANDING", difficulty: 3,
    conceptSlug: "key-9", sourceRef: "medlineplus-immune",
    stem: "أيّ مما يلي يمثّل استجابة المناعة الفطرية (الطبيعية)؟",
    options: [
      { label: "أ", text: "البلعمة بواسطة العدلات والبلاعم", correct: true },
      { label: "ب", text: "إنتاج أجسام مضادة نوعية للمستضد", whyWrong: "استجابة تكيّفية نوعية لا فطرية." },
      { label: "ج", text: "تكوين خلايا ذاكرة T", whyWrong: "سمة المناعة التكيّفية." },
      { label: "د", text: "التعرّف النوعي طويل الأمد على مستضد سابق", whyWrong: "خاصية المناعة التكيّفية." },
    ],
    whyCorrect: "المناعة الفطرية سريعة وغير نوعية وتشمل البلعمة والحواجز والالتهاب، بخلاف التكيّفية النوعية.",
  },
  {
    id: "q-antibodies", subject: "Immunology", type: "RECALL", difficulty: 2,
    conceptSlug: "key-9", sourceRef: "medlineplus-immune",
    stem: "أيّ خلية مسؤولة عن إنتاج الأجسام المضادة؟",
    options: [
      { label: "أ", text: "الخلايا البائية (B) / الخلايا البلازمية", correct: true },
      { label: "ب", text: "كريات الدم الحمراء", whyWrong: "لا تشارك في المناعة النوعية." },
      { label: "ج", text: "الصفائح الدموية", whyWrong: "دورها في التخثّر." },
      { label: "د", text: "الخلايا التائية القاتلة", whyWrong: "تقتل الخلايا المصابة لكنها لا تفرز الأجسام المضادة." },
    ],
    whyCorrect: "الخلايا البائية تتمايز إلى خلايا بلازمية تفرز الأجسام المضادة النوعية.",
  },
  {
    id: "q-inflammation", subject: "Pathology", type: "RECALL", difficulty: 2, highYield: true,
    conceptSlug: "key-9", sourceRef: "medlineplus-immune",
    stem: "ما العلامات الأساسية (الكاردينالية) للالتهاب الحادّ؟",
    options: [
      { label: "أ", text: "الاحمرار والحرارة والتورّم والألم", correct: true },
      { label: "ب", text: "الشحوب والبرودة والجفاف", whyWrong: "عكس علامات الالتهاب." },
      { label: "ج", text: "الزرقة وبطء القلب", whyWrong: "علامات غير خاصة بالالتهاب الموضعي." },
      { label: "د", text: "التنميل وفقدان الإحساس فقط", whyWrong: "ليست العلامات الكلاسيكية للالتهاب." },
    ],
    whyCorrect: "العلامات الكلاسيكية أربع: احمرار، حرارة، تورّم، ألم (وقد يُضاف فقدان الوظيفة).",
  },

  // ── الشوارد ──
  {
    id: "q-intracellular-k", subject: "Physiology", type: "RECALL", difficulty: 2,
    conceptSlug: "key-5", sourceRef: "medlineplus-potassium",
    stem: "ما الكاتيون (الأيون الموجب) الرئيس داخل الخلية؟",
    options: [
      { label: "أ", text: "البوتاسيوم (K⁺)", correct: true },
      { label: "ب", text: "الصوديوم (Na⁺)", whyWrong: "الصوديوم هو الكاتيون الرئيس خارج الخلية." },
      { label: "ج", text: "الكالسيوم (Ca²⁺)", whyWrong: "تركيزه داخل الخلية منخفض جدًا في الراحة." },
      { label: "د", text: "الكلور (Cl⁻)", whyWrong: "الكلور أنيون سالب لا كاتيون." },
    ],
    whyCorrect: "البوتاسيوم أعلى تركيزًا داخل الخلية، بينما الصوديوم أعلى خارجها.",
  },
  {
    id: "q-calcium", subject: "Physiology", type: "UNDERSTANDING", difficulty: 2,
    conceptSlug: "key-5", sourceRef: "openstax-ap-membrane",
    stem: "أيّ أيون يلعب دورًا محوريًا في تقلّص العضلات وبناء العظام؟",
    options: [
      { label: "أ", text: "الكالسيوم (Ca²⁺)", correct: true },
      { label: "ب", text: "الكلور (Cl⁻)", whyWrong: "دوره مختلف ولا يقود التقلّص العضلي." },
      { label: "ج", text: "البيكربونات", whyWrong: "دوره في التوازن الحمضي-القاعدي." },
      { label: "د", text: "اليود", whyWrong: "يرتبط بهرمونات الغدة الدرقية لا التقلّص العضلي المباشر." },
    ],
    whyCorrect: "الكالسيوم ضروري لاقتران الإثارة بالتقلّص العضلي، وهو مكوّن رئيس لمعدن العظم.",
  },

  // ── التشريح والمصطلحات ──
  {
    id: "q-sagittal", subject: "Anatomy", type: "RECALL", difficulty: 2, highYield: true,
    conceptSlug: "key-10", sourceRef: "openstax-ap-cell",
    stem: "المستوى السهمي (Sagittal plane) يقسم الجسم إلى:",
    options: [
      { label: "أ", text: "يمين ويسار", correct: true },
      { label: "ب", text: "أمام وخلف", whyWrong: "هذا ما يفعله المستوى الإكليلي (Coronal)." },
      { label: "ج", text: "أعلى وأسفل", whyWrong: "هذا ما يفعله المستوى المستعرض (Transverse)." },
      { label: "د", text: "داخلي وخارجي", whyWrong: "ليس تعريف المستوى السهمي." },
    ],
    whyCorrect: "المستوى السهمي عمودي يقسم الجسم إلى نصفين أيمن وأيسر.",
  },
  {
    id: "q-proximal", subject: "Anatomy", type: "UNDERSTANDING", difficulty: 2,
    conceptSlug: "key-10", sourceRef: "openstax-ap-cell",
    stem: "المصطلح «قريب/داني» (Proximal) يصف الموضع الأقرب إلى:",
    options: [
      { label: "أ", text: "نقطة اتصال الطرف بالجذع (الأصل)", correct: true },
      { label: "ب", text: "نهاية الطرف البعيدة", whyWrong: "هذا معنى «بعيد/قاصٍ» (Distal)." },
      { label: "ج", text: "منتصف الجسم", whyWrong: "هذا مفهوم «إنسي» (Medial)." },
      { label: "د", text: "سطح الظهر", whyWrong: "هذا مفهوم «خلفي» (Posterior)." },
    ],
    whyCorrect: "«قريب» يعني الأقرب إلى نقطة أصل الطرف أو جذع الجسم، وعكسه «بعيد».",
  },
  {
    id: "q-suffix-itis", subject: "Terminology", type: "RECALL", difficulty: 1, highYield: true,
    conceptSlug: "key-15", sourceRef: "medlineplus-terminology",
    stem: "اللاحقة «‑itis» في المصطلحات الطبية تدلّ على:",
    options: [
      { label: "أ", text: "الالتهاب", correct: true },
      { label: "ب", text: "الاستئصال", whyWrong: "الاستئصال تدل عليه اللاحقة ‑ectomy." },
      { label: "ج", text: "الشقّ الجراحي", whyWrong: "الشقّ تدل عليه اللاحقة ‑otomy." },
      { label: "د", text: "التضخّم", whyWrong: "التضخّم تدل عليه ‑megaly." },
    ],
    whyCorrect: "«‑itis» تعني التهابًا؛ مثل التهاب المفصل (Arthritis) والتهاب الكبد (Hepatitis).",
  },
  {
    id: "q-prefix-hyper", subject: "Terminology", type: "RECALL", difficulty: 1,
    conceptSlug: "key-15", sourceRef: "medlineplus-terminology",
    stem: "البادئة «hyper‑» تدلّ على:",
    options: [
      { label: "أ", text: "الزيادة أو الارتفاع فوق الطبيعي", correct: true },
      { label: "ب", text: "النقص عن الطبيعي", whyWrong: "النقص تدل عليه البادئة hypo‑." },
      { label: "ج", text: "ما حول الشيء", whyWrong: "«حول» تدل عليها peri‑." },
      { label: "د", text: "ما تحت الشيء", whyWrong: "«تحت» تدل عليها sub‑." },
    ],
    whyCorrect: "«hyper‑» تعني فوق/زيادة؛ مثل فرط بوتاسيوم الدم (Hyperkalemia).",
  },
  {
    id: "q-root-cardio", subject: "Terminology", type: "RECALL", difficulty: 1,
    conceptSlug: "key-15", sourceRef: "medlineplus-terminology",
    stem: "الجذر «cardio‑» يشير إلى:",
    options: [
      { label: "أ", text: "القلب", correct: true },
      { label: "ب", text: "الكبد", whyWrong: "الكبد يدل عليه الجذر hepato‑." },
      { label: "ج", text: "الكلية", whyWrong: "الكلية يدل عليها nephro‑ / reno‑." },
      { label: "د", text: "الرئة", whyWrong: "الرئة يدل عليها pneumo‑ / pulmo‑." },
    ],
    whyCorrect: "«cardio‑» جذر يعني القلب؛ مثل تخطيط القلب (Cardiogram).",
  },

  // ── علم الأدوية ──
  {
    id: "q-agonist", subject: "Pharmacology", type: "UNDERSTANDING", difficulty: 3,
    conceptSlug: "key-8", sourceRef: "openstax-ap-enzyme",
    stem: "ما تعريف الدواء «الناهض» (Agonist)؟",
    options: [
      { label: "أ", text: "يرتبط بالمستقبل ويُحدث استجابته الطبيعية", correct: true },
      { label: "ب", text: "يرتبط بالمستقبل ويمنع استجابته", whyWrong: "هذا تعريف الضادّ (Antagonist)." },
      { label: "ج", text: "لا يرتبط بأي مستقبل", whyWrong: "الناهض يرتبط بالمستقبل أساسًا." },
      { label: "د", text: "يدمّر المستقبل نهائيًا", whyWrong: "الارتباط الدوائي لا يعني تدمير المستقبل." },
    ],
    whyCorrect: "الناهض يرتبط بالمستقبل ويفعّله ليُحدث الاستجابة، بينما الضادّ يرتبط ويمنع التفعيل.",
  },
  {
    id: "q-adme", subject: "Pharmacology", type: "RECALL", difficulty: 2,
    conceptSlug: "key-8", sourceRef: "openstax-ap-enzyme",
    stem: "ماذا تمثّل الاختصار ADME في الحرائك الدوائية؟",
    options: [
      { label: "أ", text: "الامتصاص، التوزيع، الاستقلاب، الإطراح", correct: true },
      { label: "ب", text: "التشخيص، العلاج، المتابعة، التقييم", whyWrong: "لا علاقة له بمراحل الحرائك الدوائية." },
      { label: "ج", text: "الإدمان، الجرعة، السميّة، الأثر", whyWrong: "مصطلحات متفرّقة لا تمثّل ADME." },
      { label: "د", text: "الإعطاء، التخفيف، المزج، التخزين", whyWrong: "خطوات صيدلانية لا مراحل حركية دوائية." },
    ],
    whyCorrect: "ADME = Absorption امتصاص، Distribution توزيع، Metabolism استقلاب، Excretion إطراح.",
  },

  // ── الطب المبني على الدليل ──
  {
    id: "q-ebm-hierarchy", subject: "EBM", type: "UNDERSTANDING", difficulty: 3,
    conceptSlug: "key-16", sourceRef: "pubmed-ebm",
    stem: "أيّ مصدر يقع عادةً في قمّة هرم الأدلّة الطبية؟",
    options: [
      { label: "أ", text: "المراجعة المنهجية والتحليل البَعْدي للتجارب المعشّاة", correct: true },
      { label: "ب", text: "رأي الخبير", whyWrong: "يقع في قاعدة الهرم لضعف قوّته الاستدلالية." },
      { label: "ج", text: "تقرير حالة فردية", whyWrong: "دليل ضعيف نسبيًا لا يعمّم." },
      { label: "د", text: "دراسة على الحيوان", whyWrong: "تمهيدية ولا تُعمّم على البشر مباشرة." },
    ],
    whyCorrect: "المراجعات المنهجية والتحليلات البَعْدية للتجارب المعشّاة المضبوطة تُعدّ أعلى مستويات الدليل.",
  },

  // ── مهارات الدراسة ──
  {
    id: "q-active-recall", subject: "Study Skills", type: "APPLICATION", difficulty: 2, highYield: true,
    conceptSlug: "key-16", sourceRef: "openstax-ap-homeostasis",
    stem: "أيّ استراتيجية مذاكرة أثبتت البحوث فاعليتها الأعلى في الترسيخ طويل المدى؟",
    options: [
      { label: "أ", text: "الاسترجاع النشط مع التكرار المتباعد", correct: true },
      { label: "ب", text: "إعادة القراءة السلبية المتكرّرة", whyWrong: "أقل فاعلية وتوهم الإتقان دون ترسيخ." },
      { label: "ج", text: "تظليل النص فقط", whyWrong: "نشاط سطحي لا يعزّز الاسترجاع." },
      { label: "د", text: "الحفظ المكثّف ليلة الاختبار", whyWrong: "يعطي حفظًا قصير الأمد يتلاشى سريعًا." },
    ],
    whyCorrect: "الجمع بين الاسترجاع النشط (اختبار الذات) والتكرار المتباعد هو الأقوى بحثيًا للذاكرة طويلة الأمد.",
  },
];
