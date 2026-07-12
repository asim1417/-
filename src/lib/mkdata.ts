// ═══════════════════════════════════════════════════════════════════
//  mkdata — يربط منهج «مِفتاح الطب» الحقيقي بواجهة MedKey Gulf الجديدة.
//  مصدر الحقيقة: curriculum.ts + questionBank.ts (محتوى مُحقّق).
// ═══════════════════════════════════════════════════════════════════
import { COURSES, KEYS, LESSONS, QUESTIONS } from "./curriculum";
import type { Course, Key, Lesson, Question } from "./curriculum";

export { COURSES, KEYS, LESSONS, QUESTIONS };
export type { Course, Key, Lesson, Question };

// ── المواد المتاحة في بنك الأسئلة (للفلترة) ──
export const SUBJECTS: string[] = Array.from(new Set(QUESTIONS.map((q) => q.subject)));

// ── بطاقات مسطّحة من كل الدروس، لكل بطاقة معرّف ثابت ──
export type MKCard = { id: string; front: string; back: string; lessonSlug: string; lessonTitle: string };
export const CARDS: MKCard[] = LESSONS.flatMap((l) =>
  l.flashcards.map((c, i) => ({ id: `${l.slug}-fc-${i}`, front: c.front, back: c.back, lessonSlug: l.slug, lessonTitle: l.title }))
);

// ── خوارزمية التكرار المتباعد SuperMemo-2 ──
export type SRS = { ease: number; interval: number; reps: number; due: number };
export const defaultSRS = (): SRS => ({ ease: 2.5, interval: 0, reps: 0, due: 0 });
export const todayIndex = () => Math.floor(Date.now() / 86_400_000);

// quality: 0..5 — نربط الأزرار: أعِدها=2، جيّد=4، سهل=5
export function sm2(prev: SRS, quality: number, today: number): SRS {
  let { ease, interval, reps } = prev;
  if (quality < 3) {
    reps = 0;
    interval = 1;
  } else {
    reps += 1;
    if (reps === 1) interval = 1;
    else if (reps === 2) interval = 6;
    else interval = Math.round(interval * ease);
    ease = ease + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
    if (ease < 1.3) ease = 1.3;
  }
  return { ease: Math.round(ease * 100) / 100, interval, reps, due: today + interval };
}

// ── إحصاءات حقيقية للوحة ──
export const STATS = {
  keys: KEYS.length,
  courses: COURSES.length,
  questions: QUESTIONS.length,
  lessons: LESSONS.length,
  cards: CARDS.length,
  highYieldQuestions: QUESTIONS.filter((q) => q.highYield).length,
};
