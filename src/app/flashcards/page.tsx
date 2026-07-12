"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { LESSONS } from "@/lib/curriculum";

// ═══ بطاقات SM-2 (SuperMemo-2) — تكرار متباعد بتخزين محلي ═══
// تُرحَّل لاحقًا إلى جدول ReviewSchedule عند تفعيل حساب الطالب.

type Card = { id: string; lessonSlug: string; lessonTitle: string; front: string; back: string };
type SM2 = { ef: number; interval: number; reps: number; due: number }; // due = timestamp (ms)
type Store = Record<string, SM2>;

const KEY = "mk_sm2_v1";
const DAY = 86400000;

// كل البطاقات من دروس المنهج
const ALL: Card[] = LESSONS.flatMap((l) =>
  (l.flashcards ?? []).map((f, i) => ({
    id: `${l.slug}:${i}`, lessonSlug: l.slug, lessonTitle: l.title, front: f.front, back: f.back,
  }))
);

function loadStore(): Store {
  try { return JSON.parse(localStorage.getItem(KEY) || "{}"); } catch { return {}; }
}
function saveStore(s: Store) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* تخزين ممتلئ/محجوب */ }
}

// خوارزمية SM-2: q جودة الإجابة 0..5
function schedule(prev: SM2 | undefined, q: number, now: number): SM2 {
  let ef = prev?.ef ?? 2.5;
  let reps = prev?.reps ?? 0;
  let interval = prev?.interval ?? 0;
  if (q < 3) { reps = 0; interval = 1; }
  else {
    reps += 1;
    interval = reps === 1 ? 1 : reps === 2 ? 6 : Math.round(interval * ef);
    ef = ef + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
    if (ef < 1.3) ef = 1.3;
  }
  return { ef: Math.round(ef * 100) / 100, interval, reps, due: now + interval * DAY };
}

export default function Flashcards() {
  const [store, setStore] = useState<Store>({});
  const [ready, setReady] = useState(false);
  const [queue, setQueue] = useState<Card[]>([]);
  const [i, setI] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [studyAhead, setStudyAhead] = useState(false);
  const [now, setNow] = useState(0);

  // تحميل الحالة وبناء طابور المستحقّ
  useEffect(() => {
    const s = loadStore();
    const t = Date.now();
    setStore(s); setNow(t);
    const due = ALL.filter((c) => (s[c.id]?.due ?? 0) <= t);
    setQueue(due);
    setReady(true);
  }, []);

  function startAll() {
    setStudyAhead(true);
    setQueue(ALL);
    setI(0); setFlipped(false);
  }

  function rate(q: number) {
    const card = queue[i];
    if (!card) return;
    const next = { ...store, [card.id]: schedule(store[card.id], q, Date.now()) };
    setStore(next); saveStore(next);
    setFlipped(false);
    setI((n) => n + 1);
  }

  if (!ready) return <main className="screen"><p className="muted" style={{ marginTop: 20 }}>…جارٍ التحميل</p></main>;

  if (ALL.length === 0)
    return <main className="screen"><h2 className="h-lg">لا بطاقات بعد</h2><p className="muted">ستُضاف مع الدروس.</p></main>;

  const dueCount = ALL.filter((c) => (store[c.id]?.due ?? 0) <= now).length;
  const done = i >= queue.length;
  const card = queue[i];

  return (
    <main className="screen">
      <div className="eyebrow">المراجعة الذكية · SM-2</div>
      <h2 className="h-lg">بطاقات التكرار المتباعد</h2>
      <p className="muted" style={{ fontSize: 13 }}>
        نظام SuperMemo-2 يُظهر لك كل بطاقة في الوقت الأمثل لترسيخها. تُحفظ متابعتك على جهازك محليًا.
      </p>

      {!done && (
        <div className="fc-meta">
          <span className="chip">{studyAhead ? "دراسة مسبقة" : "مستحقّ اليوم"}</span>
          <span className="chip">بطاقة {i + 1} من {queue.length}</span>
        </div>
      )}

      {done ? (
        <div className="fc-empty">
          <div className="fc-emoji">✓</div>
          <h3>{studyAhead ? "أنهيت جولة الدراسة" : "لا بطاقات مستحقّة الآن"}</h3>
          <p className="muted" style={{ fontSize: 13 }}>
            {dueCount > 0 ? `${dueCount} بطاقة عادت للاستحقاق.` : "أحسنت — عُد لاحقًا حين تحين مواعيد المراجعة."}
          </p>
          <button className="cta full" onClick={startAll} style={{ marginTop: 8 }}>ادرس كل البطاقات ({ALL.length}) ←</button>
          <Link className="cta full teal" href="/quiz" style={{ marginTop: 10 }}>حلّ أسئلة بدلًا من ذلك ←</Link>
        </div>
      ) : (
        <>
          <div className={`fc-card ${flipped ? "flip" : ""}`} onClick={() => setFlipped((f) => !f)}>
            <div className="fc-side">
              <span className="fc-tag">{flipped ? "الإجابة" : "السؤال"}</span>
              <div className="fc-text">{flipped ? card.back : card.front}</div>
              <span className="fc-lesson">من درس: {card.lessonTitle}</span>
              {!flipped && <span className="fc-hint">اضغط للكشف</span>}
            </div>
          </div>

          {flipped ? (
            <div className="fc-rate">
              <button className="rb r0" onClick={() => rate(1)}>لا أعرف</button>
              <button className="rb r3" onClick={() => rate(3)}>صعب</button>
              <button className="rb r4" onClick={() => rate(4)}>جيد</button>
              <button className="rb r5" onClick={() => rate(5)}>سهل</button>
            </div>
          ) : (
            <button className="cta full teal" onClick={() => setFlipped(true)} style={{ marginTop: 14 }}>اكشف الإجابة</button>
          )}
        </>
      )}

      <style>{`
        .fc-meta{display:flex;gap:8px;margin:14px 0}
        .fc-meta .chip{background:var(--mint);color:var(--teal);font-size:11.5px;padding:5px 11px;border-radius:20px}
        .fc-card{background:var(--surface);border:1px solid var(--line);border-radius:20px;padding:26px 20px;min-height:210px;
          display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:var(--shadow);transition:.2s;margin-top:6px}
        .fc-card.flip{border-color:var(--primary);background:color-mix(in srgb,var(--primary) 7%,var(--surface))}
        .fc-side{text-align:center;position:relative;width:100%}
        .fc-tag{display:inline-block;background:var(--mint);color:var(--teal);font-size:10.5px;padding:3px 10px;border-radius:12px;margin-bottom:14px}
        .fc-text{font-size:17px;font-weight:600;line-height:1.9;color:var(--ink)}
        .fc-lesson{display:block;margin-top:16px;font-size:11px;color:var(--slate)}
        .fc-hint{display:block;margin-top:6px;font-size:11px;color:var(--primary)}
        .fc-rate{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:14px}
        .rb{padding:12px 4px;border-radius:12px;border:1.5px solid var(--line);background:var(--surface);
          font-family:var(--font-body);font-weight:700;font-size:12.5px;cursor:pointer;color:var(--ink)}
        .rb.r0{border-color:var(--danger);color:var(--danger)}
        .rb.r3{border-color:#b98a1e;color:#b98a1e}
        .rb.r4{border-color:var(--primary);color:var(--teal)}
        .rb.r5{border-color:var(--ok);color:var(--ok)}
        .fc-empty{background:var(--surface);border:1px solid var(--line);border-radius:20px;padding:26px 20px;text-align:center;margin-top:12px;box-shadow:var(--shadow)}
        .fc-emoji{width:54px;height:54px;margin:0 auto 12px;border-radius:50%;display:grid;place-items:center;background:var(--mintbg);color:var(--ok);font-size:26px}
        .fc-empty h3{font-size:16px;color:var(--ink)}
      `}</style>
    </main>
  );
}
