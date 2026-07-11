"use client";
import { useState, useRef, useEffect } from "react";

type Msg = { role: "user" | "assistant"; content: string; cites?: { title: string; url: string }[]; blocked?: boolean };

export default function Assistant() {
  const [msgs, setMsgs] = useState<Msg[]>([
    { role: "assistant", content: "أهلًا بك 👋\nأنا المرشد الطبي التعليمي.\nاسألني عن أي مفهوم تأسيسي وسأبسّطه لك وأربطه بمفتاحه." },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => { logRef.current?.scrollTo(0, logRef.current.scrollHeight); }, [msgs, loading]);

  async function send() {
    const q = input.trim();
    if (!q || loading) return;
    setInput("");
    const history = [...msgs, { role: "user", content: q } as Msg];
    setMsgs(history);
    setLoading(true);
    try {
      const res = await fetch("/api/assistant", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history.map((m) => ({ role: m.role, content: m.content })) }),
      });
      const data = await res.json();
      setMsgs((m) => [...m, { role: "assistant", content: data.answer ?? "تعذّر الرد.", cites: data.citations, blocked: data.blocked }]);
    } catch {
      setMsgs((m) => [...m, { role: "assistant", content: "حدث خطأ في الاتصال بالمرشد. تأكد من ضبط ANTHROPIC_API_KEY." }]);
    } finally { setLoading(false); }
  }

  return (
    <main className="screen">
      <div className="eyebrow">المرشد الطبي التعليمي</div>
      <h2 className="h-lg">اسألني كأنك طالب سنة أولى</h2>
      <div className="safety">🛡️ <span>منصة <b>تعليمية</b> فقط — لا تشخيص، ولا وصف أدوية، ولا تفسير تحاليل لمريض حقيقي.</span></div>

      <div className="chat" ref={logRef}>
        {msgs.map((m, i) => (
          <div key={i} className={`bubble ${m.role === "user" ? "me" : "ai"} ${m.blocked ? "blocked" : ""}`}>
            {m.content.split("\n").map((line, j) => <div key={j}>{line}</div>)}
            {m.cites?.map((c, j) => <a key={j} className="cite" href={c.url} target="_blank" rel="noreferrer">🔗 {c.title.slice(0, 40)}</a>)}
          </div>
        ))}
        {loading && <div className="bubble ai">…يفكّر المرشد</div>}
      </div>

      <div className="chat-input">
        <input value={input} onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()} placeholder="اكتب سؤالك التعليمي…" />
        <button onClick={send} disabled={loading}>↑</button>
      </div>

      <style>{`
        .safety{background:var(--mint);border:1px solid var(--line);border-radius:12px;padding:11px 13px;font-size:12px;color:var(--slate);display:flex;gap:8px;align-items:flex-start;margin-bottom:12px}
        .chat{display:flex;flex-direction:column;gap:12px;min-height:46vh;max-height:56vh;overflow-y:auto;padding-bottom:8px}
        .bubble{max-width:85%;padding:12px 15px;border-radius:16px;font-size:13.5px;line-height:1.8}
        .bubble.ai{background:var(--surface);border:1px solid var(--line);align-self:flex-start;border-top-right-radius:5px}
        .bubble.me{background:var(--teal);color:#fff;align-self:flex-end;border-top-left-radius:5px}
        .bubble.blocked{border-color:var(--gold-soft)}
        .cite{display:inline-block;background:var(--mint);color:var(--teal);font-size:10.5px;padding:2px 8px;border-radius:12px;margin-top:6px;margin-inline-start:5px;font-family:var(--font-display);text-decoration:none}
        .chat-input{position:sticky;bottom:0;display:flex;gap:9px;padding:12px 0 4px;background:var(--paper)}
        .chat-input input{flex:1;border:1px solid var(--line);background:var(--surface);border-radius:14px;padding:12px 14px;font-family:var(--font-body);font-size:13.5px;color:var(--ink)}
        .chat-input button{background:var(--primary);border:none;border-radius:14px;width:46px;color:#fff;font-size:18px;cursor:pointer}
      `}</style>
    </main>
  );
}
