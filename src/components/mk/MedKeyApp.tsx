"use client";
import { useState, useMemo, useEffect } from "react";
import type { CSSProperties } from "react";
import { useLang } from "@/lib/i18n";
import { Icon } from "./icons";
import { COURSES, KEYS, LESSONS, QUESTIONS, CARDS, SUBJECTS, STATS, sm2, defaultSRS, todayIndex } from "@/lib/mkdata";
import type { SRS } from "@/lib/mkdata";

type Screen = "landing" | "auth" | "home" | "paths" | "lesson" | "map" | "questions" | "cards" | "assistant" | "mobile";

const SYMBOL = "/brand/medkey-symbol.svg";
const SRS_KEY = "mk_srs_v1";
// shared style fragments
const card: CSSProperties = { background: "#fff", border: "1px solid #E9F2F7", borderRadius: 26, padding: 24, boxShadow: "0 10px 30px rgba(45,111,142,0.05)" };
const heroCard: CSSProperties = { background: "linear-gradient(150deg,#2D6F8E,#14313F)", borderRadius: 26, boxShadow: "0 26px 55px rgba(20,49,63,0.28)", color: "#fff" };
const secTitle: CSSProperties = { fontFamily: "var(--display)", fontWeight: 700, fontSize: 17, color: "#14313F" };
const kicker: CSSProperties = { fontSize: 13, fontWeight: 700, color: "#3E86A6", marginBottom: 6 };
const h1: CSSProperties = { fontFamily: "var(--display)", fontSize: 30, fontWeight: 800, margin: 0, color: "#14313F" };
const primaryBtn: CSSProperties = { display: "flex", alignItems: "center", gap: 9, background: "#2D6F8E", color: "#fff", border: "none", borderRadius: 14, padding: "14px 24px", fontFamily: "var(--body)", fontWeight: 700, fontSize: 15, cursor: "pointer", boxShadow: "0 12px 26px rgba(20,49,63,0.22)" };
const pill = (active: boolean): CSSProperties => active
  ? { background: "#2D6F8E", color: "#fff", borderRadius: 999, padding: "9px 20px", fontSize: 13, fontWeight: 700, border: "none", cursor: "pointer" }
  : { background: "#fff", border: "1px solid #E9F2F7", color: "#2D6F8E", borderRadius: 999, padding: "9px 20px", fontSize: 13, fontWeight: 600, cursor: "pointer" };
const track = (w: string, grad = "#2D6F8E", h = 8): CSSProperties => ({ height: h, borderRadius: 20, background: "#E9F2F7", overflow: "hidden" });
const fill = (w: string, grad = "#2D6F8E"): CSSProperties => ({ width: w, height: "100%", background: grad, borderRadius: 20 });
const grad = "linear-gradient(90deg,#6CB7D8,#2D6F8E)";

// lessons that actually have full content, indexed for quick lookup
const LESSON_BY_COURSE: Record<string, number[]> = LESSONS.reduce((m, l, i) => {
  (m[l.courseSlug] ||= []).push(i);
  return m;
}, {} as Record<string, number[]>);

export default function MedKeyApp() {
  const { t, isAr, dir, toggleLang } = useLang();
  const [screen, setScreen] = useState<Screen>("landing");
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [flipped, setFlipped] = useState(false);

  // ── lesson selection ──
  const [lessonIdx, setLessonIdx] = useState(0);
  const lesson = LESSONS[lessonIdx];

  // ── question bank state ──
  const [subject, setSubject] = useState<string>("all");
  const [qIdx, setQIdx] = useState(0);
  const [qSel, setQSel] = useState<string | null>(null);
  const [score, setScore] = useState({ right: 0, done: 0 });
  const quizList = useMemo(() => {
    if (subject.startsWith("lesson:")) {
      const slug = subject.slice(7);
      const ids = LESSONS.find((l) => l.slug === slug)?.questionIds ?? [];
      return QUESTIONS.filter((q) => ids.includes(q.id));
    }
    return subject === "all" ? QUESTIONS : QUESTIONS.filter((q) => q.subject === subject);
  }, [subject]);
  const q = quizList[Math.min(qIdx, quizList.length - 1)] || quizList[0];
  const pickSubject = (s: string) => { setSubject(s); setQIdx(0); setQSel(null); };
  const answer = (label: string) => {
    if (qSel) return;
    const opt = q.options.find((o) => o.label === label);
    setQSel(label);
    setScore((s) => ({ right: s.right + (opt?.correct ? 1 : 0), done: s.done + 1 }));
  };
  const nextQ = () => { setQIdx((i) => (i + 1) % quizList.length); setQSel(null); };
  const restartQ = () => { setQIdx(0); setQSel(null); setScore({ right: 0, done: 0 }); };

  // ── flashcards + SM-2 (localStorage) ──
  const [srs, setSrs] = useState<Record<string, SRS>>({});
  const [queue, setQueue] = useState<string[]>([]);
  const [pos, setPos] = useState(0);
  const today = todayIndex();
  useEffect(() => {
    try { const raw = localStorage.getItem(SRS_KEY); if (raw) setSrs(JSON.parse(raw)); } catch {}
  }, []);
  useEffect(() => {
    try { localStorage.setItem(SRS_KEY, JSON.stringify(srs)); } catch {}
  }, [srs]);
  const dueQueue = () => CARDS.filter((c) => (srs[c.id]?.due ?? 0) <= today).map((c) => c.id);
  useEffect(() => {
    if (screen === "cards") { setQueue(dueQueue()); setPos(0); setFlipped(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen]);
  const curCard = queue[pos] ? CARDS.find((c) => c.id === queue[pos]) : null;
  const rate = (quality: number) => {
    const id = queue[pos];
    if (!id) return;
    setSrs((s) => ({ ...s, [id]: sm2(s[id] ?? defaultSRS(), quality, today) }));
    setFlipped(false);
    setPos((p) => p + 1);
  };
  const studyAll = () => { setQueue(CARDS.map((c) => c.id)); setPos(0); setFlipped(false); };
  const resetSrs = () => { setSrs({}); setQueue(CARDS.map((c) => c.id)); setPos(0); setFlipped(false); };

  const arrowFwd = isAr ? "scaleX(-1)" : "none";
  const arrowBack = isAr ? "none" : "scaleX(-1)";
  const go = (s: Screen) => () => { setScreen(s); if (typeof window !== "undefined") window.scrollTo(0, 0); };
  const openLesson = (i: number) => () => { setLessonIdx(i); setScreen("lesson"); if (typeof window !== "undefined") window.scrollTo(0, 0); };
  const isChrome = screen !== "landing" && screen !== "auth";
  const lt = (en: string, ar: string) => (isAr ? ar : en);

  const navTabs: [Screen, string][] = [
    ["home", t.navHome], ["paths", t.navPaths], ["lesson", t.navLesson], ["map", t.navMap],
    ["questions", t.navQuestions], ["cards", t.navCards], ["assistant", t.navAssistant],
  ];

  return (
    <div dir={dir} style={{ minHeight: "100vh", background: "#F7FCFF", fontFamily: "var(--body)", color: "#14313F" }}>
      {/* ═══ TOP BAR ═══ */}
      {isChrome && (
        <header style={{ position: "sticky", top: 0, zIndex: 50, background: "rgba(255,255,255,0.9)", backdropFilter: "blur(14px)", borderBottom: "1px solid #E9F2F7" }}>
          <div style={{ maxWidth: 1240, margin: "0 auto", padding: "0 24px", height: 74, display: "flex", alignItems: "center", gap: 16 }}>
            <button onClick={go("home")} style={{ display: "flex", alignItems: "center", gap: 11, flexShrink: 0, background: "none", border: "none", cursor: "pointer", padding: 0 }}>
              <img src={SYMBOL} alt="MedKey Gulf" style={{ width: 44, height: 44, borderRadius: 13, boxShadow: "0 8px 20px rgba(45,111,142,0.14)" }} />
              <div style={{ lineHeight: 1.15, textAlign: isAr ? "right" : "left" }}>
                <div style={{ fontFamily: "var(--inter)", fontWeight: 800, fontSize: 18, letterSpacing: "-0.3px", color: "#14313F", whiteSpace: "nowrap" }}>MedKey <span style={{ color: "#2D6F8E" }}>Gulf</span></div>
                <div style={{ fontSize: 9.5, fontWeight: 600, letterSpacing: "0.4px", color: "#6CB7D8", whiteSpace: "nowrap" }}>{t.tagline}</div>
              </div>
            </button>
            <nav className="mk-nav" style={{ display: "flex", alignItems: "center", gap: 2, marginInlineStart: "auto" }}>
              {navTabs.map(([id, label]) => {
                const active = screen === id;
                return (
                  <button key={id} onClick={go(id)} className="mk-tab" style={{ fontFamily: "var(--body)", fontSize: 13.5, fontWeight: active ? 800 : 600, border: "none", background: active ? "#DDF4FF" : "none", color: active ? "#14313F" : "#3E86A6", padding: "9px 13px", borderRadius: 11, cursor: "pointer", whiteSpace: "nowrap" }}>{label}</button>
                );
              })}
            </nav>
            <div style={{ marginInlineStart: "auto", display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
              <button onClick={toggleLang} className="mk-ctrl" style={{ display: "flex", alignItems: "center", gap: 7, height: 40, padding: "0 15px", borderRadius: 12, border: "1px solid #E9F2F7", background: "#fff", color: "#2D6F8E", fontFamily: "var(--body)", fontSize: 13, fontWeight: 700, cursor: "pointer" }}><Icon name="globe" size={16} />{t.langSwitch}</button>
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "5px 14px 5px 5px", background: "#fff", border: "1px solid #E9F2F7", borderRadius: 999 }}>
                <div style={{ width: 34, height: 34, borderRadius: "50%", background: "linear-gradient(135deg,#2D6F8E,#14313F)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 14 }}>A</div>
                <div style={{ lineHeight: 1.2 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#14313F" }}>{t.userName}</div>
                  <div style={{ fontSize: 10, color: "#3E86A6", fontWeight: 600 }}>{t.userYear}</div>
                </div>
              </div>
            </div>
          </div>
        </header>
      )}

      {/* ═══ MAIN ═══ */}
      <main style={isChrome ? { maxWidth: 1240, margin: "0 auto", padding: "34px 28px 70px" } : {}}>
        {screen === "home" && <Home />}
        {screen === "paths" && <Paths />}
        {screen === "lesson" && <Lesson />}
        {screen === "questions" && <Questions />}
        {screen === "cards" && <Cards />}
        {screen === "assistant" && <Assistant />}
        {screen === "map" && <Map />}
        {screen === "mobile" && <Mobile />}
        {screen === "landing" && <Landing />}
        {screen === "auth" && <Auth />}
      </main>

      {/* ═══ FOOTER ═══ */}
      {isChrome && (
        <footer style={{ borderTop: "1px solid #E9F2F7", background: "#fff" }}>
          <div style={{ maxWidth: 1240, margin: "0 auto", padding: "22px 28px", display: "flex", alignItems: "center", justifyContent: "center", gap: 36, flexWrap: "wrap", fontSize: 12.5, color: "#2D6F8E", fontWeight: 600 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 9 }}><Icon name="shield" size={18} stroke="#2D6F8E" />{t.foot1}</span>
            <span style={{ display: "flex", alignItems: "center", gap: 9 }}><Icon name="cap" size={18} stroke="#2D6F8E" />{t.foot2}</span>
            <span style={{ display: "flex", alignItems: "center", gap: 9 }}><Icon name="globe" size={18} stroke="#2D6F8E" />{t.foot3}</span>
          </div>
          <div style={{ borderTop: "1px solid #F2F8FB" }}>
            <div style={{ maxWidth: 1240, margin: "0 auto", padding: "14px 28px", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, flexWrap: "wrap", fontSize: 12, color: "#3E86A6", fontWeight: 600 }}>
              <span style={{ color: "#A7D8F0" }}>{t.fPages}:</span>
              <button onClick={go("landing")} style={linkBtn}>{t.fLanding}</button>
              <span style={{ color: "#DDF4FF" }}>·</span>
              <button onClick={go("auth")} style={linkBtn}>{t.fLogin}</button>
              <span style={{ color: "#DDF4FF" }}>·</span>
              <button onClick={go("mobile")} style={linkBtn}>{t.fMobile}</button>
            </div>
          </div>
        </footer>
      )}
    </div>
  );

  // ════════════════════════════ VIEWS ════════════════════════════
  function Home() {
    const availLessons = LESSONS.map((l, i) => ({ l, i }));
    const stats: [string, string, string, number, string][] = [
      ["book", "#DDF4FF", "#2D6F8E", STATS.keys, lt("keys", "مفتاحًا")],
      ["badge", "#CFEFEA", "#1F8A6B", STATS.questions, lt("questions", "سؤالًا")],
      ["route", "#DDF4FF", "#2D6F8E", STATS.courses, lt("tracks", "مسارًا")],
      ["layers", "#F6E3B4", "#9A7B2E", STATS.cards, lt("flashcards", "بطاقة")],
    ];
    return (
      <section>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 20, marginBottom: 26, flexWrap: "wrap" }}>
          <div>
            <div style={kicker}>{t.dashKicker}</div>
            <h1 style={h1}>{t.welcome}</h1>
            <p style={{ margin: "8px 0 0", fontSize: 15, color: "#2D6F8E" }}>{t.welcomeSub}</p>
          </div>
          <button onClick={openLesson(0)} className="mk-primary" style={primaryBtn}>{t.continueBtn}<Icon name="arrow" size={18} sw={2} style={{ transform: arrowFwd }} /></button>
        </div>
        <div className="mk-grid-2" style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 22, alignItems: "start" }}>
          {/* hero progress card */}
          <div style={{ ...heroCard, padding: 26 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 9, fontFamily: "var(--display)", fontWeight: 700, fontSize: 17, color: "#DDF4FF", marginBottom: 20 }}><Icon name="key" size={19} />{t.keysTitle}</div>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 18 }}>
              <div style={{ width: 172, height: 172, borderRadius: "50%", background: "conic-gradient(#A7D8F0 0% 100%, rgba(255,255,255,0.16) 0% 100%)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ width: 130, height: 130, borderRadius: "50%", background: "#fff", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                  <div style={{ fontFamily: "var(--display)", fontWeight: 900, fontSize: 44, color: "#14313F", lineHeight: 1 }}>{STATS.keys}</div>
                  <div style={{ fontSize: 12, color: "#2D6F8E", fontWeight: 600, marginTop: 4 }}>{lt("keys", "مفتاحًا")}</div>
                </div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7, fontSize: 12.5, color: "#DDF4FF", textAlign: "center", lineHeight: 1.6 }}>{t.keysSub}</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
            {/* available lessons (real) */}
            <div style={card}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
                <div style={secTitle}>{t.resumeToday}</div>
                <button onClick={go("paths")} style={{ ...linkBtn, fontSize: 13 }}>{t.viewAll}</button>
              </div>
              <div className="mk-grid-3" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14 }}>
                {availLessons.map(({ l, i }) => (
                  <button key={l.slug} onClick={openLesson(i)} className="mk-lift" style={{ textAlign: isAr ? "right" : "left", background: "#F7FCFF", border: "1px solid #DDF4FF", borderRadius: 18, padding: 16, cursor: "pointer" }}>
                    <div style={{ fontFamily: "var(--display)", fontWeight: 700, fontSize: 14.5, color: "#14313F", marginBottom: 4, lineHeight: 1.4 }}>{isAr ? l.title : l.titleEn}</div>
                    <div style={{ fontSize: 12, color: "#3E86A6", marginBottom: 12 }}>{COURSES.find((c) => c.slug === l.courseSlug)?.[isAr ? "titleAr" : "title"]}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, color: "#2D6F8E", fontWeight: 700 }}><Icon name="arrow" size={13} sw={2.4} style={{ transform: arrowFwd }} />{t.openLesson}</div>
                  </button>
                ))}
              </div>
            </div>
            {/* content-language note */}
            <div style={{ ...card, display: "flex", gap: 12, alignItems: "center", background: "#F5FBF9", border: "1px solid #CFEFEA" }}>
              <Icon name="info" size={20} sw={1.9} stroke="#1F8A6B" />
              <div style={{ fontSize: 13, color: "#2D6F8E", lineHeight: 1.7 }}>{t.contentAr}</div>
            </div>
          </div>
        </div>
        {/* stat cards */}
        <div className="mk-grid-4" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 18, marginTop: 22 }}>
          {stats.map((r, i) => (
            <div key={i} style={{ ...card, borderRadius: 22, padding: 22, display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ width: 46, height: 46, borderRadius: 14, background: r[1], color: r[2], display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Icon name={r[0]} size={22} /></div>
              <div><div style={{ fontFamily: "var(--display)", fontWeight: 900, fontSize: 30, color: "#14313F", lineHeight: 1 }}>{r[3]}</div><div style={{ fontSize: 12.5, color: "#3E86A6", fontWeight: 600, marginTop: 5 }}>{r[4]}</div></div>
            </div>
          ))}
        </div>
        {/* the 16 keys */}
        <div style={{ marginTop: 34 }}>
          <div style={{ ...kicker, marginBottom: 2 }}>{t.dashKicker}</div>
          <h2 style={{ ...h1, fontSize: 24, marginBottom: 18 }}>{t.keysTitle}</h2>
          <div className="mk-grid-4" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16 }}>
            {KEYS.map((k) => (
              <div key={k.index} style={{ ...card, borderRadius: 20, padding: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 10, background: "#DDF4FF", color: "#2D6F8E", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--display)", fontWeight: 800, fontSize: 15, flexShrink: 0 }}>{k.index}</div>
                  <div style={{ fontFamily: "var(--display)", fontWeight: 700, fontSize: 14.5, color: "#14313F", lineHeight: 1.35 }}>{isAr ? k.ar : k.en}</div>
                </div>
                <div style={{ fontSize: 12.5, color: "#2D6F8E", lineHeight: 1.7 }}>{k.summary}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  function Paths() {
    const iconFor = ["book", "target", "flask", "atom", "cell", "layers", "route", "badge"];
    return (
      <section>
        <div style={{ textAlign: "center", marginBottom: 14 }}>
          <div style={kicker}>{t.navPaths}</div>
          <h1 style={h1}>{t.pathsRealTitle}</h1>
          <p style={{ margin: "8px 0 0", fontSize: 15, color: "#2D6F8E" }}>{t.pathsRealSub}</p>
        </div>
        <div className="mk-grid-3" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 18, marginTop: 24 }}>
          {COURSES.map((c, i) => {
            const lessonIdxs = LESSON_BY_COURSE[c.slug] || [];
            const ready = lessonIdxs.length > 0;
            return (
              <div key={c.slug} className={ready ? "mk-lift" : undefined} style={{ ...card, padding: 24, opacity: ready ? 1 : 0.72 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                  <div style={{ width: 54, height: 54, borderRadius: 16, background: ready ? "#DDF4FF" : "#F2F8FB", color: ready ? "#2D6F8E" : "#A7D8F0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>{c.icon}</div>
                  <span style={{ background: ready ? "#CFEFEA" : "#F2F8FB", color: ready ? "#1F8A6B" : "#A7D8F0", borderRadius: 999, padding: "5px 12px", fontSize: 11.5, fontWeight: 700 }}>{ready ? t.available : t.comingSoon}</span>
                </div>
                <h2 style={{ fontFamily: "var(--display)", fontSize: 18, margin: "0 0 6px", color: "#14313F" }}>{isAr ? c.titleAr : c.title}</h2>
                <p style={{ fontSize: 13, color: "#3E86A6", margin: "0 0 18px" }}>{isAr ? c.title : c.titleAr}</p>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 12.5, color: "#3E86A6", fontWeight: 600 }}>{ready ? `${lessonIdxs.length} ${t.lessonsWord}` : "—"}</span>
                  {ready ? (
                    <button onClick={openLesson(lessonIdxs[0])} className="mk-primary" style={{ display: "flex", alignItems: "center", gap: 7, background: "#2D6F8E", border: "none", color: "#fff", borderRadius: 12, padding: "9px 18px", fontFamily: "var(--body)", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>{t.openLesson}<Icon name="arrow" size={14} sw={2.2} style={{ transform: arrowFwd }} /></button>
                  ) : (
                    <span style={{ fontSize: 12.5, color: "#A7D8F0", fontWeight: 700 }}>{t.comingSoon}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    );
  }

  function Lesson() {
    const course = COURSES.find((c) => c.slug === lesson.courseSlug);
    const sect: CSSProperties = { fontFamily: "var(--display)", fontSize: 18, color: "#2D6F8E", margin: "0 0 10px" };
    return (
      <section>
        <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "#3E86A6", marginBottom: 18, flexWrap: "wrap" }}>
          <button onClick={go("paths")} style={linkBtn}>{t.navPaths}</button><Icon name="chev" size={15} sw={2} stroke="#A7D8F0" style={{ transform: arrowFwd }} /><span>{isAr ? course?.titleAr : course?.title}</span><Icon name="chev" size={15} sw={2} stroke="#A7D8F0" style={{ transform: arrowFwd }} /><span style={{ color: "#14313F", fontWeight: 700 }}>{isAr ? lesson.title : lesson.titleEn}</span>
        </div>
        <div className="mk-grid-2" style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: 22, alignItems: "start" }}>
          {/* lesson picker */}
          <div style={{ ...card, borderRadius: 24, padding: 20 }}>
            <div style={{ ...secTitle, fontSize: 15, marginBottom: 14 }}>{t.lessonPick}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {LESSONS.map((l, i) => {
                const active = i === lessonIdx;
                return (
                  <button key={l.slug} onClick={openLesson(i)} style={{ textAlign: isAr ? "right" : "left", display: "flex", alignItems: "center", gap: 10, padding: "11px 12px", borderRadius: 12, fontSize: 13, border: "none", cursor: "pointer", background: active ? "#DDF4FF" : "#F7FCFF", color: active ? "#14313F" : "#3E86A6", fontWeight: active ? 700 : 500 }}>
                    {l.highYield && <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#F6C544", flexShrink: 0 }} />}
                    <span style={{ lineHeight: 1.4 }}>{isAr ? l.title : l.titleEn}</span>
                  </button>
                );
              })}
            </div>
          </div>
          {/* lesson body */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ ...card, padding: 28 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ background: "#DDF4FF", color: "#2D6F8E", borderRadius: 999, padding: "5px 14px", fontSize: 12, fontWeight: 700 }}>{isAr ? course?.titleAr : course?.title}{lesson.highYield ? " · ★" : ""}</span>
                <div style={{ display: "flex", gap: 12, color: "#6CB7D8" }}><Icon name="bookmark" size={18} /><Icon name="download" size={18} /><Icon name="expand" size={18} /></div>
              </div>
              <h1 style={{ fontFamily: "var(--display)", fontSize: 27, margin: "12px 0 6px", color: "#14313F", lineHeight: 1.4 }}>{lesson.title}</h1>
              <div style={{ fontSize: 14, color: "#3E86A6", marginBottom: 22 }}>{lesson.titleEn}</div>

              <div style={{ display: "flex", gap: 12, background: "#F7FCFF", border: "1px solid #DDF4FF", borderRadius: 18, padding: "16px 18px", marginBottom: 22 }}>
                <Icon name="target" size={20} stroke="#2D6F8E" />
                <div style={{ fontSize: 14, lineHeight: 1.9, color: "#2D6F8E" }}><b style={{ color: "#14313F" }}>{t.whyItMatters}: </b>{lesson.whyItMatters}</div>
              </div>

              <h2 style={sect}>{t.bigIdea}</h2>
              <p style={{ fontSize: 15, lineHeight: 1.95, color: "#14313F", margin: "0 0 20px" }}>{lesson.bigIdea}</p>

              <h2 style={sect}>{t.explanation}</h2>
              <p style={{ fontSize: 15, lineHeight: 1.95, color: "#14313F", margin: "0 0 22px" }}>{lesson.explanationAr}</p>

              <div className="mk-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 22 }}>
                <div style={{ background: "#F5FBF9", border: "1px solid #CFEFEA", borderRadius: 16, padding: "16px 18px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: "var(--display)", fontWeight: 700, fontSize: 14, color: "#1F8A6B", marginBottom: 10 }}><Icon name="check" size={16} sw={2.4} stroke="#1F8A6B" />{t.highYieldT}</div>
                  <ul style={{ margin: 0, paddingInlineStart: 18, fontSize: 13.5, lineHeight: 1.9, color: "#14313F" }}>{lesson.highYieldPoints.map((p, i) => <li key={i}>{p}</li>)}</ul>
                </div>
                <div style={{ background: "#FEF6F5", border: "1px solid #F6DAD5", borderRadius: 16, padding: "16px 18px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: "var(--display)", fontWeight: 700, fontSize: 14, color: "#C0553F", marginBottom: 10 }}><Icon name="info" size={16} sw={2} stroke="#C0553F" />{t.commonMistakesT}</div>
                  <ul style={{ margin: 0, paddingInlineStart: 18, fontSize: 13.5, lineHeight: 1.9, color: "#14313F" }}>{lesson.commonMistakes.map((p, i) => <li key={i}>{p}</li>)}</ul>
                </div>
              </div>

              <h2 style={sect}>{t.keyTerms}</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 22 }}>
                {lesson.terms.map((tm, i) => (
                  <div key={i} style={{ display: "flex", gap: 12, background: "#F7FCFF", border: "1px solid #E9F2F7", borderRadius: 14, padding: "12px 16px", fontSize: 13.5, lineHeight: 1.7 }}>
                    <span style={{ fontWeight: 800, color: "#2D6F8E", flexShrink: 0 }}>{tm.en}</span>
                    <span style={{ color: "#3E86A6" }}>· {tm.ar} —</span>
                    <span style={{ color: "#14313F" }}>{tm.meaning}</span>
                  </div>
                ))}
              </div>

              <div style={{ display: "flex", gap: 12, background: "linear-gradient(135deg,#F7FCFF,#DDF4FF)", border: "1px solid #A7D8F0", borderRadius: 18, padding: "18px 20px", marginBottom: 18 }}>
                <Icon name="key" size={20} stroke="#2D6F8E" />
                <div style={{ fontSize: 14, lineHeight: 1.9, color: "#2D6F8E" }}><b style={{ color: "#14313F" }}>{t.clinicalT}: </b>{lesson.clinical}</div>
              </div>

              <div style={{ background: "#14313F", borderRadius: 16, padding: "16px 20px", color: "#DDF4FF", fontSize: 13.5, lineHeight: 1.9 }}>
                <b style={{ color: "#fff" }}>{t.summary60T}: </b>{lesson.summary60}
              </div>
            </div>

            {/* actions */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", ...card, borderRadius: 20, padding: "16px 22px", flexWrap: "wrap", gap: 12 }}>
              <button onClick={go("map")} className="mk-ctrl" style={{ display: "flex", alignItems: "center", gap: 8, background: "#F7FCFF", border: "1px solid #DDF4FF", color: "#2D6F8E", borderRadius: 12, padding: "11px 22px", fontFamily: "var(--body)", fontWeight: 700, fontSize: 14, cursor: "pointer" }}><Icon name="route" size={16} sw={2} />{t.navMap}</button>
              <button onClick={() => { pickSubject(`lesson:${lesson.slug}`); setScreen("questions"); window.scrollTo(0, 0); }} className="mk-primary" style={{ display: "flex", alignItems: "center", gap: 8, background: "#2D6F8E", border: "none", color: "#fff", borderRadius: 12, padding: "11px 26px", fontFamily: "var(--body)", fontWeight: 700, fontSize: 14, cursor: "pointer", boxShadow: "0 10px 22px rgba(20,49,63,0.22)" }}>{t.practiceThis}<Icon name="arrow" size={16} sw={2} style={{ transform: arrowFwd }} /></button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  function Questions() {
    if (!q) return <section><div style={{ ...card, textAlign: "center", padding: 60 }}>{t.cardAllDone}</div></section>;
    const answered = qSel != null;
    const pct = score.done ? Math.round((score.right / score.done) * 100) : 0;
    const subjects = ["all", ...SUBJECTS];
    return (
      <section>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 16 }}>
          <div><div style={kicker}>{t.navQuestions}</div><h1 style={{ ...h1, fontSize: 28 }}>{t.qTitle}</h1></div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {subjects.map((s) => (
              <button key={s} onClick={() => pickSubject(s)} style={{ ...pill(subject === s), padding: "8px 16px" }}>{s === "all" ? t.qAllSubjects : s}</button>
            ))}
          </div>
        </div>
        <div className="mk-grid-2" style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 22, alignItems: "start" }}>
          {/* score panel */}
          <div style={{ background: "linear-gradient(150deg,#2D6F8E,#14313F)", borderRadius: 24, padding: 24, boxShadow: "0 22px 48px rgba(20,49,63,0.26)", color: "#fff" }}>
            <div style={{ fontFamily: "var(--display)", fontWeight: 700, fontSize: 15, color: "#DDF4FF", marginBottom: 18 }}>{t.qYourScore}</div>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
              <div style={{ width: 150, height: 150, borderRadius: "50%", background: `conic-gradient(#A7D8F0 0% ${pct}%, rgba(255,255,255,0.16) ${pct}% 100%)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ width: 112, height: 112, borderRadius: "50%", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <div style={{ fontFamily: "var(--display)", fontWeight: 900, fontSize: 30, color: "#14313F", lineHeight: 1 }}>{pct}%</div>
                </div>
              </div>
            </div>
            <div style={{ textAlign: "center", fontSize: 13, color: "#A7D8F0" }}>{score.right} / {score.done} {t.qDone}</div>
            <div style={{ textAlign: "center", fontSize: 12.5, color: "#DDF4FF", marginTop: 6 }}>{quizList.length} {t.navQuestions}</div>
            <button onClick={restartQ} style={{ width: "100%", marginTop: 18, background: "rgba(255,255,255,0.14)", border: "1px solid rgba(255,255,255,0.25)", color: "#fff", borderRadius: 12, padding: 11, fontFamily: "var(--body)", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>{t.qRestart}</button>
          </div>
          {/* question */}
          <div style={{ ...card, padding: 28 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <span style={{ fontSize: 12, color: "#3E86A6", fontWeight: 600 }}>{q.subject} · {qIdx + 1} / {quizList.length}</span>
              <span style={{ background: "#F6E3B4", color: "#9A7B2E", borderRadius: 999, padding: "5px 14px", fontSize: 12, fontWeight: 700 }}>{q.type}{q.highYield ? " · ★" : ""}</span>
            </div>
            <h2 style={{ fontFamily: "var(--display)", fontSize: 20, color: "#14313F", margin: "0 0 22px", lineHeight: 1.6 }}>{q.stem}</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 22 }}>
              {q.options.map((o) => {
                const isSel = qSel === o.label;
                const showCorrect = answered && o.correct;
                const showWrong = answered && isSel && !o.correct;
                const border = showCorrect ? "2px solid #1F8A6B" : showWrong ? "2px solid #C0553F" : isSel ? "2px solid #2D6F8E" : "1px solid #E9F2F7";
                const bg = showCorrect ? "#F5FBF9" : showWrong ? "#FEF6F5" : "#F7FCFF";
                return (
                  <button key={o.label} onClick={() => answer(o.label)} disabled={answered} style={{ textAlign: isAr ? "right" : "left", display: "flex", alignItems: "flex-start", gap: 14, padding: "15px 18px", border, borderRadius: 16, background: bg, cursor: answered ? "default" : "pointer" }}>
                    <span style={{ width: 28, height: 28, borderRadius: "50%", ...(showCorrect ? { background: "#1F8A6B", color: "#fff" } : showWrong ? { background: "#C0553F", color: "#fff" } : { border: "2px solid #DDF4FF", color: "#3E86A6" }), display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, flexShrink: 0 }}>{showCorrect ? <Icon name="check" size={16} sw={2.4} /> : o.label}</span>
                    <span style={{ flex: 1 }}>
                      <span style={{ fontSize: 15, color: "#14313F", fontWeight: showCorrect ? 700 : 400 }}>{o.text}</span>
                      {showWrong && o.whyWrong && <span style={{ display: "block", fontSize: 12.5, color: "#C0553F", marginTop: 6, lineHeight: 1.7 }}>{o.whyWrong}</span>}
                    </span>
                  </button>
                );
              })}
            </div>
            {answered && (
              <div style={{ display: "flex", gap: 12, background: "#F5FBF9", border: "1px solid #CFEFEA", borderRadius: 16, padding: "16px 20px", fontSize: 14, lineHeight: 1.85, color: "#2D6F8E", marginBottom: 22 }}>
                <div style={{ flexShrink: 0, marginTop: 1 }}><Icon name="info" size={20} sw={1.9} stroke="#1F8A6B" /></div>
                <div><b style={{ color: "#14313F" }}>{t.qWhy}: </b>{q.whyCorrect}</div>
              </div>
            )}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 13, color: "#3E86A6", fontWeight: 600 }}>{answered ? (q.options.find((o) => o.label === qSel)?.correct ? `✓ ${t.qCorrect}` : `✕ ${t.qWrong}`) : ""}</span>
              <button onClick={nextQ} className="mk-primary" style={{ display: "flex", alignItems: "center", gap: 8, background: "#2D6F8E", border: "none", color: "#fff", borderRadius: 12, padding: "11px 26px", fontFamily: "var(--body)", fontWeight: 700, fontSize: 14, cursor: "pointer", boxShadow: "0 10px 22px rgba(20,49,63,0.22)" }}>{t.qNext}<Icon name="arrow" size={16} sw={2} style={{ transform: arrowFwd }} /></button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  function Cards() {
    const done = pos >= queue.length;
    const info = curCard ? srs[curCard.id] : undefined;
    return (
      <section>
        <div style={{ textAlign: "center", marginBottom: 26 }}><div style={kicker}>{t.navCards}</div><h1 style={{ ...h1, fontSize: 28 }}>{t.cardsTitle}</h1></div>
        <div className="mk-grid-2" style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: 22, alignItems: "start" }}>
          {/* deck sidebar */}
          <div style={{ ...card, borderRadius: 24, padding: 22 }}>
            <div style={{ ...secTitle, fontSize: 15, marginBottom: 16 }}>{t.decks}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {LESSONS.map((l) => {
                const n = l.flashcards.length;
                const due = l.flashcards.filter((_, i) => (srs[`${l.slug}-fc-${i}`]?.due ?? 0) <= today).length;
                return (
                  <div key={l.slug} style={{ padding: "13px 15px", borderRadius: 16, background: "#F7FCFF", border: "1px solid #E9F2F7" }}>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: "#14313F", lineHeight: 1.4 }}>{isAr ? l.title : l.titleEn}</div>
                    <div style={{ fontSize: 12, color: "#3E86A6", marginTop: 3 }}>{n} · {due} {t.cardDue}</div>
                  </div>
                );
              })}
              <button onClick={studyAll} className="mk-add" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7, marginTop: 6, background: "none", border: "1px dashed #A7D8F0", color: "#2D6F8E", borderRadius: 16, padding: 12, fontFamily: "var(--body)", fontWeight: 700, fontSize: 13, cursor: "pointer" }}><Icon name="refresh" size={16} />{t.cardStudyAll}</button>
              <button onClick={resetSrs} style={{ ...linkBtn, fontSize: 12, marginTop: 4 }}>{t.cardReset}</button>
            </div>
          </div>
          {/* study area */}
          <div>
            {done ? (
              <div style={{ ...card, textAlign: "center", padding: 60 }}>
                <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}><div style={{ width: 64, height: 64, borderRadius: "50%", background: "#CFEFEA", color: "#1F8A6B", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="check" size={32} sw={2.4} /></div></div>
                <div style={{ fontFamily: "var(--display)", fontSize: 20, fontWeight: 800, color: "#14313F", marginBottom: 20 }}>{t.cardAllDone}</div>
                <button onClick={studyAll} className="mk-primary" style={{ ...primaryBtn, display: "inline-flex" }}><Icon name="refresh" size={18} />{t.cardStudyAll}</button>
              </div>
            ) : curCard ? (
              <>
                <div onClick={() => setFlipped((f) => !f)} style={{ position: "relative", minHeight: 340, borderRadius: 28, background: "linear-gradient(135deg,#fff,#F7FCFF)", border: "1px solid #E9F2F7", boxShadow: "0 24px 55px rgba(45,111,142,0.1)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "48px 40px", textAlign: "center", cursor: "pointer" }}>
                  <span style={{ position: "absolute", top: 22, insetInlineEnd: 26, background: "#DDF4FF", color: "#2D6F8E", borderRadius: 999, padding: "5px 14px", fontSize: 12, fontWeight: 700 }}>{flipped ? t.sideA : t.sideQ}</span>
                  <span style={{ position: "absolute", top: 22, insetInlineStart: 26, fontSize: 11.5, color: "#A7D8F0", fontWeight: 600 }}>{t.cardFrom}: {curCard.lessonTitle}</span>
                  <div style={{ fontFamily: "var(--display)", fontSize: 24, fontWeight: 800, color: "#14313F", lineHeight: 1.6, marginBottom: 14 }}>{flipped ? curCard.back : curCard.front}</div>
                  {!flipped && <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13, color: "#6CB7D8" }}><Icon name="refresh" size={16} />{t.tapToFlip}</div>}
                </div>
                {flipped ? (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginTop: 20 }}>
                    <button onClick={() => rate(2)} className="mk-ctrl" style={{ background: "#FEF6F5", border: "1px solid #F6DAD5", color: "#C0553F", borderRadius: 14, padding: "14px 0", fontFamily: "var(--body)", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>{t.cardAgain}</button>
                    <button onClick={() => rate(4)} className="mk-ctrl" style={{ background: "#F7FCFF", border: "1px solid #DDF4FF", color: "#2D6F8E", borderRadius: 14, padding: "14px 0", fontFamily: "var(--body)", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>{t.cardGood}</button>
                    <button onClick={() => rate(5)} className="mk-primary" style={{ background: "#1F8A6B", border: "none", color: "#fff", borderRadius: 14, padding: "14px 0", fontFamily: "var(--body)", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>{t.cardEasy}</button>
                  </div>
                ) : (
                  <div style={{ display: "flex", justifyContent: "center", marginTop: 20 }}>
                    <button onClick={() => setFlipped(true)} className="mk-primary" style={{ ...primaryBtn, display: "inline-flex" }}>{t.cardShow}<Icon name="refresh" size={16} /></button>
                  </div>
                )}
                <div style={{ textAlign: "center", marginTop: 22 }}>
                  <div style={{ fontSize: 13, color: "#3E86A6", fontWeight: 600 }}>{pos + 1} / {queue.length}{info ? ` · ease ${info.ease}` : ""}</div>
                  <div style={{ width: 240, height: 7, borderRadius: 20, background: "#E9F2F7", overflow: "hidden", marginTop: 8, marginInline: "auto" }}><div style={{ width: `${(pos / queue.length) * 100}%`, height: "100%", background: "#2D6F8E", borderRadius: 20 }} /></div>
                </div>
              </>
            ) : (
              <div style={{ ...card, textAlign: "center", padding: 60 }}>
                <div style={{ fontFamily: "var(--display)", fontSize: 18, fontWeight: 700, color: "#14313F", marginBottom: 20 }}>{t.cardAllDone}</div>
                <button onClick={studyAll} className="mk-primary" style={{ ...primaryBtn, display: "inline-flex" }}><Icon name="refresh" size={18} />{t.cardStudyAll}</button>
              </div>
            )}
          </div>
        </div>
      </section>
    );
  }

  function Assistant() {
    return (
      <section>
        <div className="mk-grid-2" style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: 22, alignItems: "start" }}>
          <div style={{ ...card, borderRadius: 24, padding: 22 }}>
            <div style={{ ...secTitle, fontSize: 15, marginBottom: 16 }}>{t.pastChats}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ padding: "13px 15px", borderRadius: 14, background: "#DDF4FF", border: "1px solid #A7D8F0", fontSize: 13, color: "#14313F", fontWeight: 600 }}>{t.chat1}</div>
              <div style={{ padding: "13px 15px", borderRadius: 14, background: "#F7FCFF", fontSize: 13, color: "#2D6F8E" }}>{t.chat2}</div>
              <div style={{ padding: "13px 15px", borderRadius: 14, background: "#F7FCFF", fontSize: 13, color: "#2D6F8E" }}>{t.chat3}</div>
              <button className="mk-primary" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7, marginTop: 8, background: "#2D6F8E", border: "none", color: "#fff", borderRadius: 14, padding: 12, fontFamily: "var(--body)", fontWeight: 700, fontSize: 13, cursor: "pointer" }}><Icon name="plus" size={16} />{t.newChat}</button>
            </div>
          </div>
          <div style={{ ...card, borderRadius: 26, padding: 0, display: "flex", flexDirection: "column", height: 560, overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "20px 24px", borderBottom: "1px solid #F2F8FB" }}>
              <img src={SYMBOL} style={{ width: 40, height: 40, borderRadius: 12 }} alt="" />
              <div style={{ flex: 1 }}><div style={{ ...secTitle, fontSize: 16 }}>{t.navAssistant}</div><div style={{ fontSize: 11.5, color: "#9A7B2E", fontWeight: 600 }}>{t.demoNote}</div></div>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: 24, display: "flex", flexDirection: "column", gap: 16, background: "#F7FCFF" }}>
              <div style={{ alignSelf: "flex-start", maxWidth: "78%", background: "#2D6F8E", color: "#fff", borderRadius: "18px 18px 18px 6px", padding: "14px 18px", fontSize: 14, lineHeight: 1.8 }}>{t.msg1}</div>
              <div style={{ alignSelf: "flex-end", maxWidth: "78%", background: "#fff", border: "1px solid #E9F2F7", color: "#14313F", borderRadius: "18px 18px 6px 18px", padding: "14px 18px", fontSize: 14, lineHeight: 1.8 }}>{t.msg2}</div>
              <div style={{ alignSelf: "flex-start", maxWidth: "78%", background: "#2D6F8E", color: "#fff", borderRadius: "18px 18px 18px 6px", padding: "14px 18px", fontSize: 14, lineHeight: 1.9 }}>{t.msg3}</div>
            </div>
            <div style={{ padding: "18px 24px", borderTop: "1px solid #F2F8FB", display: "flex", gap: 12, alignItems: "center" }}>
              <input className="mk-input" placeholder={t.inputPlaceholder} style={{ flex: 1, border: "1px solid #E9F2F7", background: "#F7FCFF", borderRadius: 14, padding: "13px 18px", fontFamily: "var(--body)", fontSize: 14, color: "#14313F", outline: "none" }} />
              <button className="mk-primary" style={{ width: 48, height: 48, borderRadius: 14, background: "#2D6F8E", border: "none", color: "#fff", cursor: "pointer", boxShadow: "0 10px 22px rgba(20,49,63,0.22)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Icon name="send" size={20} sw={1.9} style={{ transform: arrowFwd }} /></button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  function Map() {
    const m = lesson.map;
    const half = Math.ceil(m.nodes.length / 2);
    const left = m.nodes.slice(0, half);
    const right = m.nodes.slice(half);
    const leaf = (txt: string) => <div key={txt} style={{ background: "#F7FCFF", border: "1px solid #DDF4FF", color: "#14313F", borderRadius: 12, padding: "10px 20px", fontSize: 13, fontWeight: 600, textAlign: "center" }}>{txt}</div>;
    const conn = (h: number) => <div style={{ width: 2, height: h, background: "#DDF4FF" }} />;
    return (
      <section>
        <div style={{ textAlign: "center", marginBottom: 14 }}><div style={kicker}>{t.navMap}</div><h1 style={h1}>{t.mapTitle}</h1><p style={{ margin: "8px 0 0", fontSize: 15, color: "#2D6F8E" }}>{t.mapSub}</p></div>
        <div style={{ ...card, padding: "44px 24px", marginTop: 22 }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{ background: "linear-gradient(150deg,#2D6F8E,#14313F)", color: "#fff", borderRadius: 18, padding: "16px 30px", textAlign: "center", boxShadow: "0 16px 34px rgba(20,49,63,0.22)", maxWidth: 420 }}>
              <div style={{ fontFamily: "var(--display)", fontWeight: 800, fontSize: 19 }}>{m.title}</div>
              <div style={{ fontSize: 12, color: "#A7D8F0", marginTop: 3 }}>{lesson.title}</div>
            </div>
            {conn(28)}
            <div style={{ position: "relative", display: "flex", gap: 64, justifyContent: "center", flexWrap: "wrap" }}>
              <div style={{ position: "absolute", top: 0, left: "25%", right: "25%", height: 2, background: "#DDF4FF" }} />
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                {conn(28)}
                <div style={{ background: "#DDF4FF", color: "#2D6F8E", borderRadius: 14, padding: "10px 22px", fontFamily: "var(--display)", fontWeight: 700, fontSize: 14 }}>{t.mapB1}</div>
                {conn(20)}
                <div style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "center" }}>{left.map(leaf)}</div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                {conn(28)}
                <div style={{ background: "#CFEFEA", color: "#1F8A6B", borderRadius: 14, padding: "10px 22px", fontFamily: "var(--display)", fontWeight: 700, fontSize: 14 }}>{t.mapB2}</div>
                {conn(20)}
                <div style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "center" }}>{right.map(leaf)}</div>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  function Mobile() {
    const phone = (children: React.ReactNode) => (
      <div style={{ width: 268, height: 560, borderRadius: 40, background: "#14313F", padding: 11, boxShadow: "0 30px 60px rgba(20,49,63,0.3)", flexShrink: 0 }}>
        <div style={{ width: "100%", height: "100%", borderRadius: 30, background: "#F7FCFF", overflow: "hidden", position: "relative", display: "flex", flexDirection: "column" }}>
          <div style={{ position: "absolute", top: 9, left: "50%", transform: "translateX(-50%)", width: 70, height: 6, borderRadius: 10, background: "#14313F", opacity: 0.25 }} />
          {children}
        </div>
      </div>
    );
    return (
      <section>
        <div style={{ textAlign: "center", marginBottom: 14 }}><div style={kicker}>{t.fMobile}</div><h1 style={h1}>{t.mbTitle}</h1><p style={{ margin: "8px 0 0", fontSize: 15, color: "#2D6F8E" }}>{t.mbSub}</p></div>
        <div style={{ display: "flex", justifyContent: "center", gap: 30, flexWrap: "wrap", marginTop: 32 }}>
          {phone(<>
            <div style={{ padding: "26px 18px 14px", display: "flex", alignItems: "center", gap: 9 }}><img src={SYMBOL} style={{ width: 30, height: 30, borderRadius: 9 }} alt="" /><div style={{ fontFamily: "var(--inter)", fontWeight: 800, fontSize: 14, color: "#14313F" }}>MedKey</div><div style={{ marginInlineStart: "auto", fontSize: 11, color: "#3E86A6", fontWeight: 600 }}>{t.mbHome}</div></div>
            <div style={{ flex: 1, overflow: "hidden", padding: "6px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ background: "linear-gradient(150deg,#2D6F8E,#14313F)", borderRadius: 20, padding: 18, color: "#fff", display: "flex", flexDirection: "column", alignItems: "center" }}>
                <div style={{ width: 104, height: 104, borderRadius: "50%", background: "conic-gradient(#A7D8F0 0% 100%, rgba(255,255,255,0.16) 0% 100%)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 8 }}><div style={{ width: 78, height: 78, borderRadius: "50%", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--inter)", fontWeight: 900, fontSize: 26, color: "#14313F" }}>{STATS.keys}</div></div>
                <div style={{ fontSize: 11, color: "#A7D8F0" }}>{t.keysTitle}</div>
              </div>
              {LESSONS.slice(0, 2).map((l) => (
                <div key={l.slug} style={{ background: "#fff", border: "1px solid #E9F2F7", borderRadius: 16, padding: 13 }}><div style={{ fontSize: 12, fontWeight: 700, color: "#14313F", lineHeight: 1.4 }}>{l.title}</div></div>
              ))}
            </div>
            <div style={{ display: "flex", justifyContent: "space-around", padding: "14px 10px", borderTop: "1px solid #E9F2F7", background: "#fff" }}>{[0, 1, 2, 3].map((i) => <span key={i} style={{ width: 22, height: 22, borderRadius: 7, background: i === 0 ? "#2D6F8E" : "#DDF4FF" }} />)}</div>
          </>)}
          {phone(<>
            <div style={{ padding: "26px 18px 14px", display: "flex", alignItems: "center", gap: 9 }}><div style={{ fontFamily: "var(--display)", fontWeight: 800, fontSize: 14, color: "#14313F" }}>{t.mbLesson}</div></div>
            <div style={{ flex: 1, overflow: "hidden", padding: "6px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ height: 90, borderRadius: 16, background: "linear-gradient(135deg,#F7FCFF,#DDF4FF)", border: "1px solid #DDF4FF", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="cell" size={36} sw={1.5} stroke="#6CB7D8" /></div>
              <div style={{ fontFamily: "var(--display)", fontWeight: 800, fontSize: 14, color: "#14313F", lineHeight: 1.5 }}>{LESSONS[0].title}</div>
              <div style={{ background: "#F7FCFF", border: "1px solid #DDF4FF", borderRadius: 14, padding: 12, fontSize: 11, color: "#2D6F8E", lineHeight: 1.7 }}>{LESSONS[0].summary60}</div>
            </div>
            <div style={{ padding: "12px 16px", background: "#fff", borderTop: "1px solid #E9F2F7" }}><div style={{ background: "#2D6F8E", color: "#fff", borderRadius: 12, padding: 11, textAlign: "center", fontSize: 12.5, fontWeight: 700 }}>{t.next}</div></div>
          </>)}
          {phone(<>
            <div style={{ padding: "26px 18px 14px", display: "flex", alignItems: "center", gap: 9 }}><div style={{ fontFamily: "var(--display)", fontWeight: 800, fontSize: 14, color: "#14313F" }}>{t.mbQuiz}</div><div style={{ marginInlineStart: "auto", fontSize: 11, color: "#3E86A6", fontWeight: 600 }}>1 / {QUESTIONS.length}</div></div>
            <div style={{ flex: 1, overflow: "hidden", padding: "6px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ fontFamily: "var(--display)", fontWeight: 700, fontSize: 12.5, color: "#14313F", lineHeight: 1.6 }}>{QUESTIONS[0].stem}</div>
              {QUESTIONS[0].options.slice(0, 3).map((o) => (
                <div key={o.label} style={{ border: o.correct ? "2px solid #2D6F8E" : "1px solid #E9F2F7", background: o.correct ? "#DDF4FF" : "#fff", borderRadius: 12, padding: 10, fontSize: 11, color: "#14313F", fontWeight: o.correct ? 700 : 400, display: "flex", gap: 9, alignItems: "center", lineHeight: 1.5 }}><span style={{ width: 18, height: 18, borderRadius: "50%", border: o.correct ? "none" : "2px solid #DDF4FF", background: o.correct ? "#1F8A6B" : "none", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>{o.correct && <Icon name="check" size={11} sw={3} stroke="#fff" />}</span>{o.text}</div>
              ))}
            </div>
            <div style={{ padding: "12px 16px", background: "#fff", borderTop: "1px solid #E9F2F7" }}><div style={{ background: "#2D6F8E", color: "#fff", borderRadius: 12, padding: 11, textAlign: "center", fontSize: 12.5, fontWeight: 700 }}>{t.qNext}</div></div>
          </>)}
        </div>
      </section>
    );
  }

  function Landing() {
    return (
      <section>
        {/* landing top bar */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, maxWidth: 1240, margin: "0 auto", padding: "22px 34px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 11 }}><img src={SYMBOL} style={{ width: 42, height: 42, borderRadius: 12 }} alt="" /><div style={{ fontFamily: "var(--inter)", fontWeight: 800, fontSize: 18, color: "#14313F" }}>MedKey <span style={{ color: "#2D6F8E" }}>Gulf</span></div></div>
          <div style={{ marginInlineStart: "auto", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <button onClick={toggleLang} className="mk-ctrl" style={{ height: 38, padding: "0 14px", borderRadius: 11, border: "1px solid #E9F2F7", background: "#fff", color: "#2D6F8E", fontFamily: "var(--body)", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>{t.langSwitch}</button>
            <button onClick={go("auth")} style={{ height: 38, padding: "0 16px", borderRadius: 11, border: "1px solid #DDF4FF", background: "#fff", color: "#2D6F8E", fontFamily: "var(--body)", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>{t.auTabLogin}</button>
            <button onClick={go("home")} className="mk-primary" style={{ height: 38, padding: "0 16px", borderRadius: 11, border: "none", background: "#2D6F8E", color: "#fff", fontFamily: "var(--body)", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>{t.fApp}</button>
          </div>
        </div>
        {/* hero */}
        <div style={{ background: "linear-gradient(160deg,#F7FCFF 0%,#DDF4FF 100%)" }}>
          <div className="mk-hero-grid" style={{ maxWidth: 1240, margin: "0 auto", padding: "60px 34px 70px", display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: 40, alignItems: "center" }}>
            <div>
              <div style={{ display: "inline-block", background: "#fff", border: "1px solid #A7D8F0", color: "#2D6F8E", borderRadius: 999, padding: "7px 16px", fontSize: 12.5, fontWeight: 700, marginBottom: 22 }}>{t.lnKicker}</div>
              <h1 style={{ fontFamily: "var(--display)", fontSize: 46, lineHeight: 1.2, fontWeight: 900, margin: "0 0 18px", color: "#14313F" }}>{t.lnTitle}</h1>
              <p style={{ fontSize: 17, lineHeight: 1.8, color: "#2D6F8E", margin: "0 0 28px", maxWidth: 520 }}>{t.lnSub}</p>
              <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
                <button onClick={go("auth")} className="mk-primary" style={{ display: "flex", alignItems: "center", gap: 9, background: "#2D6F8E", color: "#fff", border: "none", borderRadius: 14, padding: "15px 28px", fontFamily: "var(--body)", fontWeight: 700, fontSize: 15, cursor: "pointer", boxShadow: "0 14px 30px rgba(20,49,63,0.24)" }}>{t.lnCta1}<Icon name="arrow" size={18} sw={2} style={{ transform: arrowFwd }} /></button>
                <button onClick={go("paths")} style={{ background: "#fff", color: "#2D6F8E", border: "1px solid #A7D8F0", borderRadius: 14, padding: "15px 28px", fontFamily: "var(--body)", fontWeight: 700, fontSize: 15, cursor: "pointer" }}>{t.lnCta2}</button>
              </div>
              <div style={{ marginTop: 30, fontSize: 13, color: "#3E86A6", fontWeight: 600 }}>{t.lnTrust}</div>
            </div>
            <div style={{ display: "flex", justifyContent: "center" }}>
              <div style={{ position: "relative", width: 320, height: 320 }}>
                <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "radial-gradient(circle,#fff 0%,rgba(255,255,255,0) 70%)" }} />
                <img src={SYMBOL} style={{ position: "relative", width: "100%", height: "100%", filter: "drop-shadow(0 30px 50px rgba(45,111,142,0.28))" }} alt="" />
              </div>
            </div>
          </div>
        </div>
        {/* features */}
        <div style={{ maxWidth: 1240, margin: "0 auto", padding: "64px 34px" }}>
          <div className="mk-grid-3" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 22 }}>
            {[["atom", "#DDF4FF", "#2D6F8E", t.lnF1, t.lnF1d], ["badge", "#CFEFEA", "#1F8A6B", t.lnF2, t.lnF2d], ["lamp", "#F6E3B4", "#9A7B2E", t.lnF3, t.lnF3d]].map((f, i) => (
              <div key={i} style={{ ...card, borderRadius: 24, padding: 28 }}>
                <div style={{ width: 54, height: 54, borderRadius: 16, background: f[1] as string, color: f[2] as string, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 18 }}><Icon name={f[0] as string} size={26} sw={1.7} /></div>
                <h3 style={{ fontFamily: "var(--display)", fontSize: 18, margin: "0 0 8px", color: "#14313F" }}>{f[3] as string}</h3>
                <p style={{ fontSize: 14, lineHeight: 1.75, color: "#2D6F8E", margin: 0 }}>{f[4] as string}</p>
              </div>
            ))}
          </div>
        </div>
        {/* band */}
        <div style={{ background: "#F7FCFF", borderTop: "1px solid #E9F2F7", borderBottom: "1px solid #E9F2F7" }}>
          <div style={{ maxWidth: 1240, margin: "0 auto", padding: "52px 34px", textAlign: "center" }}>
            <h2 style={{ fontFamily: "var(--display)", fontSize: 26, fontWeight: 800, margin: "0 0 30px", color: "#14313F" }}>{t.lnBandTitle}</h2>
            <div style={{ display: "flex", justifyContent: "center", gap: 14, flexWrap: "wrap" }}>
              {[t.lnBand1, t.lnBand2, t.lnBand3, t.lnBand4].map((b, i) => <span key={i} style={{ background: "#fff", border: "1px solid #DDF4FF", color: "#2D6F8E", borderRadius: 999, padding: "11px 22px", fontSize: 14, fontWeight: 700 }}>{b}</span>)}
            </div>
          </div>
        </div>
        {/* final cta */}
        <div style={{ maxWidth: 1240, margin: "0 auto", padding: "70px 34px" }}>
          <div style={{ background: "linear-gradient(150deg,#2D6F8E,#14313F)", borderRadius: 30, padding: "56px 40px", textAlign: "center", boxShadow: "0 30px 60px rgba(20,49,63,0.28)" }}>
            <h2 style={{ fontFamily: "var(--display)", fontSize: 32, fontWeight: 900, margin: "0 0 12px", color: "#fff" }}>{t.lnFinalTitle}</h2>
            <p style={{ fontSize: 16, color: "#A7D8F0", margin: "0 0 28px" }}>{t.lnFinalSub}</p>
            <button onClick={go("auth")} style={{ background: "#fff", color: "#14313F", border: "none", borderRadius: 14, padding: "16px 34px", fontFamily: "var(--body)", fontWeight: 800, fontSize: 15, cursor: "pointer", boxShadow: "0 14px 30px rgba(0,0,0,0.18)" }}>{t.lnFinalCta}</button>
          </div>
        </div>
      </section>
    );
  }

  function Auth() {
    const isLogin = authMode === "login";
    const tabOn: CSSProperties = { flex: 1, padding: 11, border: "none", borderRadius: 10, background: "#fff", color: "#14313F", fontFamily: "var(--body)", fontSize: 14, fontWeight: 800, cursor: "pointer", boxShadow: "0 4px 12px rgba(45,111,142,0.1)" };
    const tabOff: CSSProperties = { flex: 1, padding: 11, border: "none", borderRadius: 10, background: "none", color: "#3E86A6", fontFamily: "var(--body)", fontSize: 14, fontWeight: 700, cursor: "pointer" };
    const label: CSSProperties = { display: "block", fontSize: 12.5, fontWeight: 700, color: "#2D6F8E", marginBottom: 7 };
    const input: CSSProperties = { width: "100%", border: "1px solid #E9F2F7", background: "#F7FCFF", borderRadius: 12, padding: "13px 16px", fontFamily: "var(--body)", fontSize: 14, color: "#14313F", outline: "none" };
    return (
      <section style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(160deg,#F7FCFF,#DDF4FF)", padding: "40px 20px" }}>
        <div className="mk-auth-grid" style={{ width: "100%", maxWidth: 920, display: "grid", gridTemplateColumns: "1fr 1fr", background: "#fff", borderRadius: 28, overflow: "hidden", boxShadow: "0 40px 80px rgba(20,49,63,0.2)" }}>
          <div style={{ background: "linear-gradient(160deg,#2D6F8E,#14313F)", padding: "44px 38px", color: "#fff", display: "flex", flexDirection: "column" }}>
            <button onClick={go("landing")} style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: "auto", cursor: "pointer", background: "none", border: "none", padding: 0 }}>
              <img src={SYMBOL} style={{ width: 44, height: 44, borderRadius: 12 }} alt="" />
              <div style={{ fontFamily: "var(--inter)", fontWeight: 800, fontSize: 18, color: "#fff" }}>MedKey <span style={{ color: "#A7D8F0" }}>Gulf</span></div>
            </button>
            <div style={{ margin: "40px 0" }}><div style={{ fontFamily: "var(--display)", fontSize: 24, fontWeight: 800, lineHeight: 1.5 }}>{t.auBrandLine}</div></div>
            <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 14 }}>
              {[t.lnBand1, t.lnBand2, t.lnF3].map((b, i) => <div key={i} style={{ display: "flex", alignItems: "center", gap: 11, fontSize: 14, color: "#DDF4FF" }}><Icon name="check" size={18} sw={2.2} stroke="#CFEFEA" />{b}</div>)}
            </div>
          </div>
          <div style={{ padding: "44px 40px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
            <div style={{ display: "flex", background: "#F7FCFF", border: "1px solid #E9F2F7", borderRadius: 14, padding: 5, marginBottom: 26 }}>
              <button onClick={() => setAuthMode("login")} style={isLogin ? tabOn : tabOff}>{t.auTabLogin}</button>
              <button onClick={() => setAuthMode("signup")} style={!isLogin ? tabOn : tabOff}>{t.auTabSignup}</button>
            </div>
            <h2 style={{ fontFamily: "var(--display)", fontSize: 24, fontWeight: 800, margin: "0 0 6px", color: "#14313F" }}>{isLogin ? t.auWelcome : t.auStart}</h2>
            <p style={{ fontSize: 14, color: "#3E86A6", margin: "0 0 26px" }}>{isLogin ? t.auWelcomeSub : t.auStartSub}</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {!isLogin && <div><label style={label}>{t.auName}</label><input className="mk-input" placeholder={t.auNamePh} style={input} /></div>}
              <div><label style={label}>{t.auEmail}</label><input className="mk-input" placeholder={t.auEmailPh} style={input} /></div>
              <div><label style={label}>{t.auPass}</label><input className="mk-input" type="password" placeholder={t.auPassPh} style={input} /></div>
              {isLogin && <div style={{ textAlign: "end" }}><a href="#" onClick={(e) => e.preventDefault()} style={{ fontSize: 12.5, fontWeight: 600 }}>{t.auForgot}</a></div>}
              <button onClick={go("home")} className="mk-primary" style={{ background: "#2D6F8E", color: "#fff", border: "none", borderRadius: 13, padding: 15, fontFamily: "var(--body)", fontWeight: 700, fontSize: 15, cursor: "pointer", boxShadow: "0 12px 26px rgba(20,49,63,0.2)", marginTop: 4 }}>{isLogin ? t.auSubmitLogin : t.auSubmitSignup}</button>
            </div>
            <div style={{ textAlign: "center", marginTop: 22, fontSize: 13, color: "#3E86A6" }}>{isLogin ? t.auAltLogin : t.auAltSignup} <button onClick={() => setAuthMode(isLogin ? "signup" : "login")} style={{ background: "none", border: "none", color: "#2D6F8E", fontFamily: "var(--body)", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>{isLogin ? t.auAltLoginLink : t.auAltSignupLink}</button></div>
          </div>
        </div>
      </section>
    );
  }
}

const linkBtn: CSSProperties = { background: "none", border: "none", color: "#2D6F8E", fontFamily: "var(--body)", fontSize: 12, fontWeight: 700, cursor: "pointer" };
