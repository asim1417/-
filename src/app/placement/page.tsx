"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { QUESTIONS, KEYS, LESSONS } from "@/lib/curriculum";

// ═══ اختبار تحديد المستوى — يبني على بنك الأسئلة المُحقّق ═══
// يقيس القوة/الضعف لكل مفتاح (conceptSlug) ويوصي بمسار بداية.
// النتيجة تُحفظ محليًا، وتُرحَّل لاحقًا إلى StudentProfile.placementScore.

const KEY_STORE = "mk_placement_v1";
const N = 12;

// اختيار متنوّع حسب المادة (Round-robin) — ثابت بلا عشوائية
function pickQuestions() {
  const bySubject: Record<string, typeof QUESTIONS> = {};
  for (const q of QUESTIONS) (bySubject[q.subject] ??= []).push(q);
  const subjects = Object.keys(bySubject);
  const picked: typeof QUESTIONS = [];
  let round = 0;
  while (picked.length < Math.min(N, QUESTIONS.length)) {
    let added = false;
    for (const s of subjects) {
      const q = bySubject[s][round];
      if (q) { picked.push(q); added = true; if (picked.length >= N) break; }
    }
    if (!added) break;
    round++;
  }
  return picked;
}

const keyIndexFromSlug = (slug?: string) => (slug?.startsWith("key-") ? Number(slug.slice(4)) : NaN);
const lessonForConcept = (slug?: string) => LESSONS.find((l) => l.conceptSlugs.includes(slug ?? ""));

export default function Placement() {
  const [quiz] = useState(pickQuestions);
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [correctByConcept, setCorrectByConcept] = useState<Record<string, { ok: number; total: number }>>({});
  const [score, setScore] = useState<number | null>(null);
  const [saved, setSaved] = useState<{ score: number; date: string } | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY_STORE);
      if (raw) setSaved(JSON.parse(raw));
    } catch { /* لا شيء محفوظ */ }
  }, []);

  const q = quiz[i];
  const done = score !== null;

  function choose(idx: number) {
    if (picked !== null) return;
    setPicked(idx);
    const isCorrect = !!q.options[idx]?.correct;
    const slug = q.conceptSlug ?? "other";
    setCorrectByConcept((prev) => {
      const cur = prev[slug] ?? { ok: 0, total: 0 };
      return { ...prev, [slug]: { ok: cur.ok + (isCorrect ? 1 : 0), total: cur.total + 1 } };
    });
  }

  function next() {
    setPicked(null);
    if (i + 1 < quiz.length) { setI(i + 1); return; }
    // احتساب النتيجة
    const totals = Object.values(correctByConcept);
    const ok = totals.reduce((a, c) => a + c.ok, 0);
    const total = totals.reduce((a, c) => a + c.total, 0) || 1;
    const s = Math.round((ok / total) * 100);
    setScore(s);
    try { localStorage.setItem(KEY_STORE, JSON.stringify({ score: s, date: new Date().toISOString().slice(0, 10) })); } catch { /* محجوب */ }
  }

  function restart() {
    setI(0); setPicked(null); setCorrectByConcept({}); setScore(null);
  }

  if (done) {
    const level = score >= 80 ? "متقدّم" : score >= 55 ? "متوسط" : "مبتدئ";
    // أضعف المفاتيح: أدنى نسبة صحّة (total>0)
    const weak = Object.entries(correctByConcept)
      .filter(([slug, v]) => slug !== "other" && v.total > 0)
      .map(([slug, v]) => ({ slug, rate: v.ok / v.total, key: KEYS.find((k) => k.index === keyIndexFromSlug(slug)) }))
      .filter((w) => w.rate < 1 && w.key)
      .sort((a, b) => a.rate - b.rate)
      .slice(0, 3);
    const startLesson = lessonForConcept(weak[0]?.slug) ?? LESSONS[0];

    return (
      <main className="screen">
        <div className="eyebrow">نتيجة تحديد المستوى</div>
        <h2 className="h-lg">مستواك: {level}</h2>
        <div className="pl-score">
          <div className="ring" style={{ background: `conic-gradient(var(--primary) ${score * 3.6}deg, var(--line) 0)` }}>
            <span>{score}%</span>
          </div>
          <p className="muted" style={{ fontSize: 13 }}>{Object.values(correctByConcept).reduce((a, c) => a + c.ok, 0)} إجابة صحيحة من {quiz.length}.</p>
        </div>

        {weak.length > 0 ? (
          <>
            <div className="section-title">مفاتيح تحتاج تركيزًا</div>
            {weak.map((w) => (
              <div key={w.slug} className="pl-weak">
                <div className="key-num">{w.key!.index}</div>
                <div><div className="en">{w.key!.en}</div><div className="ar">{w.key!.ar}</div></div>
                <span className="pl-rate">{Math.round(w.rate * 100)}%</span>
              </div>
            ))}
          </>
        ) : (
          <div className="pl-perfect">أداء ممتاز عبر كل المفاتيح — واصِل التوسّع! 🎯</div>
        )}

        <Link className="cta full" href={`/lessons/${startLesson.slug}`}>ابدأ من: {startLesson.title} ←</Link>
        <Link className="cta full teal" href="/flashcards" style={{ marginTop: 10 }}>راجع ببطاقات SM-2 ←</Link>
        <button className="pl-restart" onClick={restart}>إعادة الاختبار</button>

        <style>{styles}</style>
      </main>
    );
  }

  const correctIdx = q.options.findIndex((o) => o.correct);
  const cls = (idx: number) => (picked === null ? "" : idx === correctIdx ? "correct" : idx === picked ? "wrong" : "");

  return (
    <main className="screen">
      <div className="eyebrow">اختبار تحديد المستوى · سؤال {i + 1} من {quiz.length}</div>
      <h2 className="h-lg">أين تقف الآن؟</h2>
      {saved && i === 0 && picked === null && (
        <div className="pl-prev">آخر نتيجة محفوظة: <b>{saved.score}%</b> ({saved.date})</div>
      )}
      <div className="pl-bar"><i style={{ width: `${(i / quiz.length) * 100}%` }} /></div>

      <div className="q-card">
        <div className="q-meta">
          <span className="chip">{q.subject}</span>
          <span className="chip">صعوبة {q.difficulty}/5</span>
        </div>
        <div className="q-text">{q.stem}</div>
        {q.options.map((o, idx) => (
          <div key={idx} className={`opt ${cls(idx)}`} onClick={() => choose(idx)}>
            <span className="letter">{o.label}</span> {o.text}
          </div>
        ))}
        {picked !== null && (
          <div className="explain">
            <p><b>الصحيح:</b> {q.whyCorrect}</p>
          </div>
        )}
      </div>

      {picked !== null && (
        <button className="cta full gold-btn" onClick={next}>
          {i + 1 < quiz.length ? "التالي ←" : "أظهر نتيجتي ←"}
        </button>
      )}

      <style>{styles}</style>
    </main>
  );
}

const styles = `
  .pl-prev{background:var(--mint);border:1px solid var(--line);border-radius:12px;padding:9px 13px;font-size:12px;color:var(--slate);margin-bottom:10px}
  .pl-bar{height:6px;background:var(--mint);border-radius:20px;overflow:hidden;margin-bottom:14px}
  .pl-bar i{display:block;height:100%;background:linear-gradient(90deg,var(--gulf),var(--primary));transition:width .3s}
  .q-card{background:var(--surface);border:1px solid var(--line);border-radius:18px;padding:18px;box-shadow:var(--shadow)}
  .q-meta{display:flex;gap:7px;flex-wrap:wrap;margin-bottom:12px}
  .chip{background:var(--mint);color:var(--teal);font-size:11.5px;padding:5px 11px;border-radius:20px}
  .q-text{font-size:15px;font-weight:600;line-height:1.9;color:var(--ink)}
  .opt{display:flex;align-items:center;gap:11px;border:1.5px solid var(--line);border-radius:12px;padding:12px 14px;margin-top:10px;cursor:pointer;transition:.15s;font-size:13.5px;color:var(--ink)}
  .opt:hover{border-color:var(--primary)}
  .opt .letter{width:26px;height:26px;flex:none;border-radius:8px;display:grid;place-items:center;background:var(--mint);font-family:var(--font-display);font-weight:600;font-size:12.5px;color:var(--teal)}
  .opt.correct{border-color:var(--ok);background:color-mix(in srgb,var(--ok) 12%,transparent)}
  .opt.correct .letter{background:var(--ok);color:#fff}
  .opt.wrong{border-color:var(--danger);background:color-mix(in srgb,var(--danger) 10%,transparent)}
  .opt.wrong .letter{background:var(--danger);color:#fff}
  .explain{margin-top:12px;border-top:1px solid var(--line);padding-top:11px;font-size:12.5px;color:var(--slate)}
  .gold-btn{background:var(--primary);color:#fff;margin-top:14px}
  .pl-score{text-align:center;margin:18px 0}
  .ring{width:130px;height:130px;border-radius:50%;margin:0 auto 12px;display:grid;place-items:center}
  .ring span{width:98px;height:98px;border-radius:50%;background:var(--paper);display:grid;place-items:center;font-family:var(--font-display);font-size:28px;font-weight:700;color:var(--teal)}
  .pl-weak{display:flex;align-items:center;gap:12px;background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:13px;margin-bottom:10px}
  .pl-weak .key-num{width:34px;height:34px;flex:none;border-radius:10px;display:grid;place-items:center;font-family:var(--font-display);font-weight:700;color:#fff;background:linear-gradient(150deg,var(--gulf),var(--primary) 55%,var(--teal))}
  .pl-weak .en{font-family:var(--font-en);font-weight:600;font-size:13.5px;color:var(--ink)}
  .pl-weak .ar{font-size:12px;color:var(--slate);margin-top:2px}
  .pl-rate{margin-inline-start:auto;font-family:var(--font-display);font-weight:700;color:var(--danger);font-size:14px}
  .pl-perfect{background:var(--mintbg);border-radius:12px;padding:14px;text-align:center;color:var(--ok);font-size:13.5px;margin:14px 0}
  .pl-restart{margin:16px auto 0;display:block;background:none;border:1px solid var(--line);color:var(--slate);border-radius:12px;padding:10px 22px;font-family:var(--font-body);font-size:13px;cursor:pointer}
`;
