"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Stats = { ok?: boolean; dbReady?: boolean; questions?: number; approved?: number; pending?: number; lessons?: number; sources?: number; chunks?: number };

export default function AdminHome() {
  const [s, setS] = useState<Stats | null>(null);
  const [topic, setTopic] = useState("");
  const [msg, setMsg] = useState("");
  const router = useRouter();

  useEffect(() => { fetch("/api/admin/stats").then((r) => r.json()).then(setS).catch(() => setS({ ok: false })); }, []);

  async function ingest() {
    if (!topic.trim()) return;
    setMsg("…جارٍ الاستيعاب");
    const r = await fetch("/api/ingest", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ topic }) });
    const d = await r.json();
    setMsg(d.ok ? `تم استيعاب ${d.chunks} مقطعًا من «${topic}» ✓` : `تعذّر: ${d.error || "خطأ"}`);
  }
  async function logout() { await fetch("/api/auth/logout", { method: "POST" }); router.push("/login"); }

  const dbReady = s?.ok !== false && s?.dbReady !== false;

  return (
    <main className="screen">
      <div className="eyebrow">لوحة التحكم</div>
      <h2 className="h-lg">مركز إدارة المنصة</h2>
      {!dbReady && <div className="warn">قاعدة البيانات غير مهيّأة بعد. الإحصاءات صفرية حتى تشغيل db:push + db:seed.</div>}

      <div className="kpis">
        <div className="kpi"><b>{s?.questions ?? 0}</b><span>سؤال</span></div>
        <div className="kpi ok"><b>{s?.approved ?? 0}</b><span>معتمد</span></div>
        <div className="kpi warn2"><b>{s?.pending ?? 0}</b><span>قيد المراجعة</span></div>
        <div className="kpi"><b>{s?.lessons ?? 0}</b><span>درس</span></div>
        <div className="kpi"><b>{s?.sources ?? 0}</b><span>مصدر</span></div>
        <div className="kpi"><b>{s?.chunks ?? 0}</b><span>مقطع</span></div>
      </div>

      <div className="section-title">إجراءات</div>
      <Link href="/admin/review" className="admin-row"><span>🔬 المراجعة العلمية</span><b>{s?.pending ?? 0} بانتظارك ←</b></Link>

      <div className="admin-card">
        <h4>استيعاب مصدر مفتوح</h4>
        <p className="muted" style={{ fontSize: 12 }}>يجلب من MedlinePlus / PubMed إلى قاعدة المصادر (RAG).</p>
        <div className="ing-row">
          <input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="مثال: homeostasis" />
          <button className="cta" onClick={ingest}>استيعاب</button>
        </div>
        {msg && <div className="ing-msg">{msg}</div>}
      </div>

      <button className="logout" onClick={logout}>تسجيل الخروج</button>

      <style>{`
        .warn{background:#FEF9EC;border:1px solid var(--sand);border-radius:12px;padding:11px 13px;font-size:12px;color:#7a5f1e;margin-top:14px}
        .kpis{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:16px}
        .kpi{background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:14px;text-align:center}
        .kpi b{display:block;font-family:var(--font-display);font-size:22px;color:var(--teal)}
        .kpi.ok b{color:var(--ok)} .kpi.warn2 b{color:#b98a1e}
        .kpi span{font-size:11px;color:var(--slate)}
        .admin-row{display:flex;justify-content:space-between;align-items:center;background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:15px;text-decoration:none;color:var(--ink);font-size:13.5px}
        .admin-row b{color:var(--primary);font-size:12.5px}
        .admin-card{background:var(--surface);border:1px solid var(--line);border-radius:16px;padding:16px;margin-top:12px}
        .admin-card h4{font-size:14px;color:var(--ink)}
        .ing-row{display:flex;gap:9px;margin-top:10px}
        .ing-row input{flex:1;border:1px solid var(--line);background:var(--paper);border-radius:12px;padding:11px 13px;font-family:var(--font-body);font-size:13px;color:var(--ink)}
        .ing-row .cta{margin-top:0}
        .ing-msg{font-size:12px;color:var(--teal);margin-top:10px}
        .logout{margin:22px auto 0;display:block;background:none;border:1px solid var(--line);color:var(--slate);border-radius:12px;padding:10px 20px;font-family:var(--font-body);font-size:13px;cursor:pointer}
      `}</style>
    </main>
  );
}
