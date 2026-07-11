// بذر قاعدة البيانات من منهج «مِفتاح الطب»
import { PrismaClient } from "@prisma/client";
import { COURSES, KEYS, LESSONS, QUESTIONS, SOURCE_SEEDS } from "../src/lib/curriculum";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 بدء البذر…");

  // 1) الجامعات والبرنامج (عيّنة)
  const uni = await prisma.university.upsert({
    where: { id: "seed-kau" },
    update: {},
    create: { id: "seed-kau", name: "جامعة الملك عبدالعزيز", nameEn: "KAU", country: "SA", city: "جدة" },
  });
  const program = await prisma.medicalProgram.upsert({
    where: { id: "seed-mbbs" },
    update: {},
    create: { id: "seed-mbbs", name: "بكالوريوس الطب والجراحة", universityId: uni.id, framework: "SaudiMED" },
  });

  // مُراجع علمي افتراضي (لبوابة المراجعة)
  await prisma.user.upsert({
    where: { email: "reviewer@miftah.example" }, update: {},
    create: { id: "seed-reviewer", email: "reviewer@miftah.example", name: "مراجع علمي", role: "REVIEWER" },
  });

  // 2) المفاتيح الـ16 (Concepts)
  for (const k of KEYS) {
    await prisma.concept.upsert({
      where: { slug: `key-${k.index}` },
      update: { title: k.ar, titleEn: k.en, summary: k.summary, isKey: true, keyIndex: k.index },
      create: { slug: `key-${k.index}`, title: k.ar, titleEn: k.en, summary: k.summary, isKey: true, keyIndex: k.index },
    });
  }

  // 3) المسارات (Courses)
  for (const c of COURSES) {
    await prisma.course.upsert({
      where: { slug: c.slug },
      update: { title: c.title, titleAr: c.titleAr, icon: c.icon, orderIndex: c.order, programId: program.id },
      create: { slug: c.slug, title: c.title, titleAr: c.titleAr, icon: c.icon, orderIndex: c.order, programId: program.id },
    });
  }

  // 4) المصادر المفتوحة
  for (const s of SOURCE_SEEDS) {
    await prisma.sourceDocument.upsert({
      where: { provider_externalId: { provider: s.provider, externalId: s.externalId } },
      update: { title: s.title, url: s.url, license: s.license },
      create: { provider: s.provider, externalId: s.externalId, title: s.title, url: s.url, license: s.license },
    });
  }

  // 5) الأسئلة + الخيارات + الشرح
  for (const q of QUESTIONS) {
    const concept = q.conceptSlug ? await prisma.concept.findUnique({ where: { slug: q.conceptSlug } }) : null;
    const question = await prisma.question.upsert({
      where: { id: q.id },
      update: { stem: q.stem, subject: q.subject, type: q.type as any, difficulty: q.difficulty, isHighYield: !!q.highYield, conceptId: concept?.id },
      create: { id: q.id, stem: q.stem, subject: q.subject, type: q.type as any, difficulty: q.difficulty, isHighYield: !!q.highYield, conceptId: concept?.id, approved: false, reviewStatus: "pending" },
    });
    await prisma.answerOption.deleteMany({ where: { questionId: question.id } });
    await prisma.answerOption.createMany({
      data: q.options.map((o) => ({ questionId: question.id, label: o.label, text: o.text, isCorrect: !!o.correct, whyWrong: o.whyWrong })),
    });
    await prisma.questionExplanation.upsert({
      where: { questionId: question.id },
      update: { whyCorrect: q.whyCorrect },
      create: { questionId: question.id, whyCorrect: q.whyCorrect },
    });
  }

  // 6) الدروس + المصطلحات + الخرائط + البطاقات + الروابط
  for (const l of LESSONS) {
    const lesson = await prisma.lesson.upsert({
      where: { slug: l.slug },
      update: {},
      create: {
        slug: l.slug, courseSlug: l.courseSlug, title: l.title, titleEn: l.titleEn, orderIndex: l.order,
        whyItMatters: l.whyItMatters, bigIdea: l.bigIdea, explanationAr: l.explanationAr, clinical: l.clinical,
        highYield: l.highYieldPoints, commonMistakes: l.commonMistakes, summary60: l.summary60, isHighYield: !!l.highYield,
      },
    });

    for (const t of l.terms) {
      const term = await prisma.medicalTerm.create({ data: { termEn: t.en, termAr: t.ar, root: t.root, meaning: t.meaning } });
      await prisma.lessonTerm.create({ data: { lessonId: lesson.id, termId: term.id } });
    }

    await prisma.conceptMap.create({
      data: {
        lessonId: lesson.id, title: l.map.title,
        nodes: l.map.nodes.map((n, i) => ({ id: i, label: n })),
        edges: l.map.nodes.slice(1).map((_, i) => ({ from: i, to: i + 1 })),
      },
    });

    for (const f of l.flashcards) await prisma.flashcard.create({ data: { lessonId: lesson.id, front: f.front, back: f.back } });

    for (const slug of l.conceptSlugs) {
      const c = await prisma.concept.findUnique({ where: { slug } });
      if (c) await prisma.lessonConcept.upsert({ where: { lessonId_conceptId: { lessonId: lesson.id, conceptId: c.id } }, update: {}, create: { lessonId: lesson.id, conceptId: c.id } });
    }

    for (const qid of l.questionIds) await prisma.question.update({ where: { id: qid }, data: { lessonId: lesson.id } }).catch(() => {});

    for (const ref of l.sources) {
      const doc = await prisma.sourceDocument.findFirst({ where: { externalId: ref } });
      if (doc) await prisma.citation.create({ data: { documentId: doc.id, lessonId: lesson.id } });
    }
  }

  console.log("✅ اكتمل البذر: ", { keys: KEYS.length, courses: COURSES.length, lessons: LESSONS.length, questions: QUESTIONS.length });
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
