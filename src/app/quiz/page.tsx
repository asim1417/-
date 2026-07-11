"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { QUESTIONS as CURRICULUM_Q } from "@/lib/curriculum";

type Opt = { label: string; text: string; correct?: boolean; whyWrong?: string };
type Q = { id: string; subject: string; type: string; difficulty: number; highYield?: boolean; stem: string; options: Opt[]; whyCorrect: string; conceptSlug?: string };

function normalize(row: any): Q {
  return {
    id: row.id, subject: row.subject, type: row.type, difficulty: row.difficulty,
    highYield: row.isHighYield ?? row.highYield, stem: row.stem,
    options: (row.options ?? []).map((o: any) => ({ label: o.label, text: o.text, correct: o.isCorrect ?? o.correct, whyWrong: o.whyWrong })),
    whyCorrect: row.explanation?.whyCorrect ?? row.whyCorrect ?? "",
    conceptSlug: row.conceptSlug,
  };
}

export default function Quiz() {
  const [bank, setBank] = useState<Q[]>(CURRICULUM_Q as Q[]);
  const [preview, setPreview] = useState(true);
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/questions");
        const d = await r.json();
        if (d.questions?.length && d.reviewed) { setBank(d.questions.map(normalize)); setPreview(false); }
      } catch { /* نبقى على المنهج كمعاينة */ }
    })();
  }, []);

  const q = bank[i];
  const correctIdx = q.options.findIndex((o) => o.correct);
  const pick = (idx: number) => { if (picked === null) setPicked(idx); };
  const next = () => { setPicked(null); setI((n) => (n + 1) % bank.length); };
  const cls = (idx: number) => (picked === null ? "" : idx === correctIdx ? "correct" : idx === picked ? "wrong" : "");

  return (
    <main className="screen">
      <div className="eyebrow">بنك الأسئلة · سؤال {i + 1} من {bank.length}</div>
      <h2 className="h-lg">اختبر فهمك</h2>
      {preview && (
        <div className="preview-note">
          👁️ عرض تجريبي — هذه أسئلة <b>قيد المراجعة العلمية</b>. لن تُعرض للطلاب إلا بعد اعتمادها من
          <Link href="/admin/review" style={{ color: "var(--teal)", fontWeight: 700 }}> لوحة المراجعة</Link>.
        </div>
      )}

      <div className="q-card">
        <div className="q-meta">
          <span className="chip">{q.subject}</span>
          <span className="chip">{q.type}</span>
          {q.highYield && <span className="chip gold">High-yield</span>}
          <span className="chip">صعوبة {q.difficulty}/5</span>
        </div>
        <div className="q-text">{q.stem}</div>
        {q.options.map((o, idx) => (
          <div key={idx} className={`opt ${cls(idx)}`} onClick={() => pick(idx)}>
            <span className="letter">{o.label}</span> {o.text}
          </div>
        ))}

        {picked !== null && (
          <div className="explain show">
            <h5>لماذا الإجابة الصحيحة؟</h5>
            <p>{q.whyCorrect}</p>
            <h5>لماذا الخيارات الأخرى خطأ؟</h5>
            {q.options.filter((o) => !o.correct && o.whyWrong).map((o) => (<p key={o.label}><b>{o.label})</b> {o.whyWrong}</p>))}
            {q.conceptSlug && <span className="cite">🔗 المفهوم المرتبط: {q.conceptSlug}</span>}
          </div>
        )}
      </div>

      {picked !== null && <button className="cta full gold-btn" onClick={next}>السؤال التالي ←</button>}
      <Link className="cta full teal" href="/assistant" style={{ marginTop: 10 }}>اسأل المرشد الطبي ←</Link>

      <style>{`
        .preview-note{background:#FEF9EC;border:1px solid var(--sand);border-radius:12px;padding:11px 13px;font-size:12px;color:#7a5f1e;margin-bottom:14px;line-height:1.7}
        [data-theme="dark"] .preview-note{background:#2A2717;border-color:#4A421F;color:#e6d29a}
        .q-card{background:var(--surface);border:1px solid var(--line);border-radius:18px;padding:18px;box-shadow:var(--shadow)}
        .q-meta{display:flex;gap:7px;flex-wrap:wrap;margin-bottom:12px}
        .chip{background:var(--mint);color:var(--teal);font-size:11.5px;padding:5px 11px;border-radius:20px}
        .chip.gold{background:#FBF0D2;color:#8a6d2a}
        .q-text{font-size:15px;font-weight:600;line-height:1.9;color:var(--ink)}
        .opt{display:flex;align-items:center;gap:11px;border:1.5px solid var(--line);border-radius:12px;padding:12px 14px;margin-top:10px;cursor:pointer;transition:.15s;font-size:13.5px}
        .opt:hover{border-color:var(--primary)}
        .opt .letter{width:26px;height:26px;flex:none;border-radius:8px;display:grid;place-items:center;background:var(--mint);font-family:var(--font-display);font-weight:600;font-size:12.5px;color:var(--teal)}
        .opt.correct{border-color:var(--ok);background:color-mix(in srgb,var(--ok) 12%,transparent)}
        .opt.correct .letter{background:var(--ok);color:#fff}
        .opt.wrong{border-color:var(--danger);background:color-mix(in srgb,var(--danger) 10%,transparent)}
        .opt.wrong .letter{background:var(--danger);color:#fff}
        .explain{margin-top:14px;border-top:1px solid var(--line);padding-top:13px}
        .explain h5{font-size:13px;color:var(--teal);margin-bottom:5px}
        .explain p{font-size:12.5px;color:var(--slate);margin-bottom:9px}
        .cite{display:inline-block;background:var(--mint);color:var(--teal);font-size:10.5px;padding:2px 8px;border-radius:12px;margin-top:6px;font-family:var(--font-en)}
        .gold-btn{background:var(--primary);color:#fff;margin-top:14px}
      `}</style>
    </main>
  );
}
