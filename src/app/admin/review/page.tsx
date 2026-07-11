"use client";
import { useEffect, useState } from "react";

type Opt = { label: string; text: string; isCorrect: boolean; whyWrong?: string };
type Q = { id: string; stem: string; subject: string; type: string; difficulty: number; isHighYield: boolean; options: Opt[]; explanation?: { whyCorrect: string } };

export default function ReviewDashboard() {
  const [qs, setQs] = useState<Q[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  async function load() {
    setLoading(true); setErr("");
    try {
      const r = await fetch("/api/review");
      const d = await r.json();
      if (d.error) setErr("لتشغيل اللوحة: هيّئ قاعدة البيانات ثم نفّذ db:seed.");
      setQs(d.questions ?? []);
    } catch { setErr("تعذّر الاتصال بالخادم."); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  async function act(id: string, action: "approve" | "reject") {
    setQs((prev) => prev.filter((q) => q.id !== id)); // إزالة فورية من القائمة
    await fetch("/api/review", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, action }) });
  }

  return (
    <main className="screen">
      <div className="eyebrow">لوحة المراجعة العلمية</div>
      <h2 className="h-lg">اعتماد الأسئلة</h2>
      <p className="muted" style={{ fontSize: 13 }}>لا يُعرض أيّ سؤال للطالب قبل اعتماده هنا. راجِع الصحة العلمية ودقّة الشرح.</p>

      {loading && <p className="muted" style={{ marginTop: 16 }}>…جارٍ التحميل</p>}
      {err && <div className="rev-note">{err}</div>}
      {!loading && !err && qs.length === 0 && <div className="rev-note ok">لا أسئلة قيد المراجعة ✓ — كل شيء معتمد.</div>}

      {qs.map((q) => (
        <div key={q.id} className="rev-card">
          <div className="q-meta">
            <span className="chip">{q.subject}</span>
            <span className="chip">{q.type}</span>
            <span className="chip">صعوبة {q.difficulty}/5</span>
            {q.isHighYield && <span className="chip gold">High-yield</span>}
          </div>
          <div className="q-stem">{q.stem}</div>
          {q.options.map((o) => (
            <div key={o.label} className={`rev-opt ${o.isCorrect ? "correct" : ""}`}>
              <b>{o.label})</b> {o.text}
              {o.isCorrect ? <span className="ok-badge">الصحيحة</span> : (o.whyWrong && <div className="why">سبب الخطأ: {o.whyWrong}</div>)}
            </div>
          ))}
          {q.explanation?.whyCorrect && <div className="rev-exp">الشرح: {q.explanation.whyCorrect}</div>}
          <div className="rev-actions">
            <button className="btn reject" onClick={() => act(q.id, "reject")}>رفض</button>
            <button className="btn approve" onClick={() => act(q.id, "approve")}>اعتماد ✓</button>
          </div>
        </div>
      ))}

      <style>{`
        .rev-note{background:var(--mint);border:1px solid var(--line);border-radius:12px;padding:12px 14px;font-size:13px;color:var(--slate);margin-top:16px}
        .rev-note.ok{color:var(--teal)}
        .rev-card{background:var(--surface);border:1px solid var(--line);border-radius:18px;padding:16px;margin-top:14px;box-shadow:var(--shadow)}
        .q-meta{display:flex;gap:7px;flex-wrap:wrap;margin-bottom:10px}
        .chip{background:var(--mint);color:var(--teal);font-size:11px;padding:4px 10px;border-radius:20px}
        .chip.gold{background:#FBF0D2;color:#8a6d2a}
        .q-stem{font-size:14.5px;font-weight:600;line-height:1.9;color:var(--ink)}
        .rev-opt{border:1px solid var(--line);border-radius:11px;padding:10px 12px;margin-top:8px;font-size:13px}
        .rev-opt.correct{border-color:var(--ok);background:color-mix(in srgb,var(--ok) 10%,transparent)}
        .ok-badge{display:inline-block;margin-inline-start:8px;background:var(--ok);color:#fff;font-size:10.5px;padding:2px 8px;border-radius:10px}
        .why{font-size:11.5px;color:var(--slate);margin-top:4px}
        .rev-exp{margin-top:10px;font-size:12.5px;color:var(--teal);background:var(--mint);border-radius:10px;padding:10px}
        .rev-actions{display:flex;gap:10px;margin-top:14px}
        .btn{flex:1;padding:11px;border-radius:12px;border:none;font-family:var(--font-body);font-weight:700;font-size:13px;cursor:pointer}
        .btn.approve{background:var(--ok);color:#fff}
        .btn.reject{background:none;border:1px solid var(--danger);color:var(--danger)}
      `}</style>
    </main>
  );
}
