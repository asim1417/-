"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Login() {
  const [email, setEmail] = useState("");
  const [passcode, setPasscode] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function submit() {
    setBusy(true); setErr("");
    const r = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, passcode }) });
    const d = await r.json();
    setBusy(false);
    if (d.ok) router.push("/admin"); else setErr(d.error || "تعذّر الدخول");
  }

  return (
    <main className="screen" style={{ paddingTop: 40 }}>
      <div className="eyebrow">دخول الطاقم</div>
      <h2 className="h-lg">لوحة التحكم</h2>
      <p className="muted" style={{ fontSize: 13 }}>للمُراجعين والمحررين والمشرفين فقط.</p>
      <div className="login-card">
        <label>البريد</label>
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="reviewer@miftah.example" />
        <label>رمز الدخول</label>
        <input type="password" value={passcode} onChange={(e) => setPasscode(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} placeholder="••••••" />
        {err && <div className="err">{err}</div>}
        <button className="cta full" onClick={submit} disabled={busy}>{busy ? "…" : "دخول"}</button>
        <p className="hint">تجريبيًا: أي بريد يبدأ بـ admin@ أو reviewer@ + الرمز في ADMIN_PASSCODE.</p>
      </div>
      <style>{`
        .login-card{background:var(--surface);border:1px solid var(--line);border-radius:18px;padding:18px;margin-top:16px;box-shadow:var(--shadow)}
        .login-card label{display:block;font-size:12.5px;font-weight:600;color:var(--teal);margin:10px 2px 6px}
        .login-card input{width:100%;border:1px solid var(--line);background:var(--paper);border-radius:12px;padding:12px 14px;font-family:var(--font-body);font-size:14px;color:var(--ink)}
        .err{color:var(--danger);font-size:12.5px;margin-top:10px}
        .hint{font-size:11px;color:var(--slate);margin-top:12px;line-height:1.7}
        .login-card .cta{margin-top:16px}
      `}</style>
    </main>
  );
}
