"use client";
import { useState } from "react";
import type { CSSProperties } from "react";
import { useLang } from "@/lib/i18n";
import { Icon } from "./icons";

type Screen = "landing" | "auth" | "home" | "paths" | "lesson" | "map" | "questions" | "cards" | "assistant" | "mobile";

const SYMBOL = "/brand/medkey-symbol.svg";
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

export default function MedKeyApp() {
  const { t, isAr, dir, toggleLang } = useLang();
  const [screen, setScreen] = useState<Screen>("landing");
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [flipped, setFlipped] = useState(false);
  const arrowFwd = isAr ? "scaleX(-1)" : "none";
  const arrowBack = isAr ? "none" : "scaleX(-1)";
  const go = (s: Screen) => () => { setScreen(s); if (typeof window !== "undefined") window.scrollTo(0, 0); };
  const isChrome = screen !== "landing" && screen !== "auth";

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
    return (
      <section>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 20, marginBottom: 26, flexWrap: "wrap" }}>
          <div>
            <div style={kicker}>{t.dashKicker}</div>
            <h1 style={h1}>{t.welcome}</h1>
            <p style={{ margin: "8px 0 0", fontSize: 15, color: "#2D6F8E" }}>{t.welcomeSub}</p>
          </div>
          <button onClick={go("lesson")} className="mk-primary" style={primaryBtn}>{t.continueBtn}<Icon name="arrow" size={18} sw={2} style={{ transform: arrowFwd }} /></button>
        </div>
        <div className="mk-grid-2" style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 22, alignItems: "start" }}>
          {/* hero progress card */}
          <div style={{ ...heroCard, padding: 26 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 9, fontFamily: "var(--display)", fontWeight: 700, fontSize: 17, color: "#DDF4FF", marginBottom: 20 }}><Icon name="clock" size={19} />{t.todayPath}</div>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 18 }}>
              <div style={{ width: 172, height: 172, borderRadius: "50%", background: "conic-gradient(#A7D8F0 0% 68%, rgba(255,255,255,0.16) 68% 100%)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ width: 130, height: 130, borderRadius: "50%", background: "#fff", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                  <div style={{ fontFamily: "var(--display)", fontWeight: 900, fontSize: 38, color: "#14313F", lineHeight: 1 }}>{t.n68}</div>
                  <div style={{ fontSize: 12, color: "#2D6F8E", fontWeight: 600, marginTop: 4 }}>{t.todayProgress}</div>
                </div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7, fontSize: 13, color: "#DDF4FF", marginBottom: 16 }}><Icon name="check" size={15} sw={2.2} stroke="#CFEFEA" />{t.onTrack}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#A7D8F0", fontWeight: 600 }}><span>{t.overall}</span><span>{t.n68}</span></div>
              <div style={{ height: 9, borderRadius: 20, background: "rgba(255,255,255,0.18)", overflow: "hidden" }}><div style={{ width: "68%", height: "100%", background: "linear-gradient(90deg,#A7D8F0,#CFEFEA)", borderRadius: 20 }} /></div>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
            {/* resume today */}
            <div style={card}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
                <div style={secTitle}>{t.resumeToday}</div>
                <a href="#" onClick={(e) => e.preventDefault()} style={{ fontSize: 13, fontWeight: 600 }}>{t.viewAll}</a>
              </div>
              <div className="mk-grid-4" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr) 80px", gap: 14 }}>
                {[[t.subjCell, t.nextOrganelles, "75%"], [t.subjTissues, t.nextEpithelium, "40%"], [t.subjBiochem, t.nextEnzymes, "25%"]].map(([s1, s2, w], i) => (
                  <div key={i} style={{ background: "#F7FCFF", border: "1px solid #DDF4FF", borderRadius: 18, padding: 16 }}>
                    <div style={{ fontFamily: "var(--display)", fontWeight: 700, fontSize: 15, color: "#14313F", marginBottom: 4 }}>{s1}</div>
                    <div style={{ fontSize: 12, color: "#3E86A6", marginBottom: 12 }}>{s2}</div>
                    <div style={{ ...track(w), marginBottom: 6 }}><div style={fill(w as string)} /></div>
                    <div style={{ fontSize: 11, color: "#2D6F8E", fontWeight: 700, textAlign: "end" }}>{w}</div>
                  </div>
                ))}
                <button className="mk-add" style={{ background: "#DDF4FF", border: "1px dashed #A7D8F0", borderRadius: 18, color: "#2D6F8E", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="plus" size={26} /></button>
              </div>
            </div>
            {/* recent activity */}
            <div style={card}>
              <div style={{ ...secTitle, marginBottom: 16 }}>{t.recentActivity}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {[["check", "#CFEFEA", "#1F8A6B", t.act1, t.act1t, false], ["help", "#DDF4FF", "#2D6F8E", t.act2, t.act2t, false], ["layers", "#F6E3B4", "#9A7B2E", t.act3, t.act3t, true]].map((r, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 6px", borderBottom: r[5] ? "none" : "1px solid #F2F8FB" }}>
                    <div style={{ width: 38, height: 38, borderRadius: 11, background: r[1] as string, color: r[2] as string, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Icon name={r[0] as string} size={19} sw={2} /></div>
                    <div style={{ flex: 1 }}><div style={{ fontSize: 14, fontWeight: 700, color: "#14313F" }}>{r[3] as string}</div><div style={{ fontSize: 12, color: "#3E86A6" }}>{r[4] as string}</div></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        {/* stat cards */}
        <div className="mk-grid-4" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 18, marginTop: 22 }}>
          {[["book", "#DDF4FF", "#2D6F8E", t.n16, t.statLessons], ["badge", "#CFEFEA", "#1F8A6B", t.n44, t.statQuestions], ["route", "#DDF4FF", "#2D6F8E", t.n7, t.statPaths], ["clock", "#F6E3B4", "#9A7B2E", t.n45, t.statHours]].map((r, i) => (
            <div key={i} style={{ ...card, borderRadius: 22, padding: 22, display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ width: 46, height: 46, borderRadius: 14, background: r[1] as string, color: r[2] as string, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Icon name={r[0] as string} size={22} /></div>
              <div><div style={{ fontFamily: "var(--display)", fontWeight: 900, fontSize: 30, color: "#14313F", lineHeight: 1 }}>{r[3] as string}</div><div style={{ fontSize: 12.5, color: "#3E86A6", fontWeight: 600, marginTop: 5 }}>{r[4] as string}</div></div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  function Paths() {
    const cards: [string, string, string, string, string, string, string][] = [
      ["book", "#DDF4FF", "#2D6F8E", t.path1, t.path1d, "75%", t.lessons12],
      ["target", "#CFEFEA", "#1F8A6B", t.path2, t.path2d, "60%", t.lessons10],
      ["flask", "#F6E3B4", "#9A7B2E", t.path3, t.path3d, "40%", t.lessons8],
    ];
    return (
      <section>
        <div style={{ textAlign: "center", marginBottom: 14 }}>
          <div style={kicker}>{t.navPaths}</div>
          <h1 style={h1}>{t.pathsTitle}</h1>
          <p style={{ margin: "8px 0 0", fontSize: 15, color: "#2D6F8E" }}>{t.pathsSub}</p>
        </div>
        <div style={{ display: "flex", justifyContent: "center", gap: 8, margin: "22px 0 26px", flexWrap: "wrap" }}>
          {[t.filterAll, t.filterCore, t.filterSkills, t.filterReview].map((f, i) => <span key={i} style={pill(i === 0)}>{f}</span>)}
        </div>
        <div className="mk-grid-3" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 20 }}>
          {cards.map((c, i) => (
            <div key={i} className="mk-lift" style={{ ...card, padding: 26 }}>
              <div style={{ width: 60, height: 60, borderRadius: 18, background: c[1], color: c[2], display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 18 }}><Icon name={c[0]} size={28} sw={1.7} /></div>
              <h2 style={{ fontFamily: "var(--display)", fontSize: 19, margin: "0 0 8px", color: "#14313F" }}>{c[3]}</h2>
              <p style={{ fontSize: 13.5, color: "#2D6F8E", lineHeight: 1.75, margin: "0 0 18px" }}>{c[4]}</p>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#3E86A6", fontWeight: 600, marginBottom: 7 }}><span>{t.pathProgress}</span><span style={{ color: "#2D6F8E", fontWeight: 700 }}>{c[5]}</span></div>
              <div style={{ ...track(c[5]), marginBottom: 16 }}><div style={fill(c[5], grad)} /></div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 12, color: "#3E86A6" }}>{c[6]}</span>
                <button onClick={go("lesson")} className="mk-primary" style={{ background: "#2D6F8E", border: "none", color: "#fff", borderRadius: 12, padding: "9px 20px", fontFamily: "var(--body)", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>{t.resume}</button>
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  function Lesson() {
    const toc: [string, "done" | "current" | "up"][] = [[t.toc1, "done"], [t.toc2, "done"], [t.toc3, "current"], [t.toc4, "up"], [t.toc5, "up"]];
    return (
      <section>
        <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "#3E86A6", marginBottom: 18, flexWrap: "wrap" }}>
          <a href="#" onClick={(e) => e.preventDefault()}>{t.path2}</a><Icon name="chev" size={15} sw={2} stroke="#A7D8F0" style={{ transform: arrowFwd }} /><a href="#" onClick={(e) => e.preventDefault()}>{t.subjCell}</a><Icon name="chev" size={15} sw={2} stroke="#A7D8F0" style={{ transform: arrowFwd }} /><span style={{ color: "#14313F", fontWeight: 700 }}>{t.lessonTitle}</span>
        </div>
        <div className="mk-grid-2" style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: 22, alignItems: "start" }}>
          <div style={{ ...card, borderRadius: 24, padding: 20 }}>
            <div style={{ ...secTitle, fontSize: 15, marginBottom: 14 }}>{t.lessonContent}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {toc.map(([label, st], i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 12, fontSize: 13, background: st === "current" ? "#DDF4FF" : st === "done" ? "#F7FCFF" : "none", color: st === "current" ? "#14313F" : st === "done" ? "#3E86A6" : "#A7D8F0", fontWeight: st === "current" ? 700 : 400 }}>
                  {st === "done" && <Icon name="check" size={16} sw={2.2} stroke="#1F8A6B" />}
                  {st === "current" && <svg width={16} height={16} viewBox="0 0 24 24" fill="#2D6F8E" stroke="none"><circle cx={12} cy={12} r={6} /></svg>}
                  {st === "up" && <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx={12} cy={12} r={7} /></svg>}
                  {label}
                </div>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ ...card, padding: 28 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ background: "#DDF4FF", color: "#2D6F8E", borderRadius: 999, padding: "5px 14px", fontSize: 12, fontWeight: 700 }}>{t.lessonMeta}</span>
                <div style={{ display: "flex", gap: 12, color: "#6CB7D8" }}><Icon name="bookmark" size={18} /><Icon name="download" size={18} /><Icon name="expand" size={18} /></div>
              </div>
              <h1 style={{ fontFamily: "var(--display)", fontSize: 28, margin: "12px 0 20px", color: "#14313F" }}>{t.lessonTitle}</h1>
              <div style={{ height: 280, borderRadius: 20, background: "linear-gradient(135deg,#F7FCFF,#DDF4FF)", border: "1px solid #DDF4FF", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, marginBottom: 22 }}>
                <Icon name="cell" size={52} sw={1.5} stroke="#6CB7D8" />
                <div style={{ fontFamily: "monospace", fontSize: 12, color: "#6CB7D8" }}>{t.lessonFig}</div>
              </div>
              <h2 style={{ fontFamily: "var(--display)", fontSize: 19, color: "#2D6F8E", margin: "0 0 10px" }}>{t.toc3}</h2>
              <p style={{ fontSize: 15, lineHeight: 1.95, color: "#14313F", margin: "0 0 14px" }}>{t.lessonBody}</p>
              <div style={{ display: "flex", gap: 12, background: "#F7FCFF", border: "1px solid #DDF4FF", borderRadius: 18, padding: "18px 20px", fontSize: 14, lineHeight: 1.9, color: "#2D6F8E" }}>
                <div style={{ flexShrink: 0, marginTop: 2 }}><Icon name="key" size={20} stroke="#2D6F8E" /></div>
                <div><b style={{ color: "#14313F" }}>{t.keyLabel}</b> {t.lessonKey}</div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", ...card, borderRadius: 20, padding: "16px 22px" }}>
              <button className="mk-ctrl" style={{ display: "flex", alignItems: "center", gap: 8, background: "#F7FCFF", border: "1px solid #DDF4FF", color: "#2D6F8E", borderRadius: 12, padding: "11px 22px", fontFamily: "var(--body)", fontWeight: 700, fontSize: 14, cursor: "pointer" }}><Icon name="back" size={16} sw={2} style={{ transform: arrowBack }} />{t.prev}</button>
              <div style={{ flex: 1, margin: "0 22px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#3E86A6", fontWeight: 600, marginBottom: 6 }}><span>{t.lessonProgress}</span><span style={{ color: "#2D6F8E", fontWeight: 700 }}>{t.n75}</span></div>
                <div style={track("75%")}><div style={fill("75%", grad)} /></div>
              </div>
              <button onClick={go("questions")} className="mk-primary" style={{ display: "flex", alignItems: "center", gap: 8, background: "#2D6F8E", border: "none", color: "#fff", borderRadius: 12, padding: "11px 26px", fontFamily: "var(--body)", fontWeight: 700, fontSize: 14, cursor: "pointer", boxShadow: "0 10px 22px rgba(20,49,63,0.22)" }}>{t.next}<Icon name="arrow" size={16} sw={2} style={{ transform: arrowFwd }} /></button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  function Questions() {
    const opts: [string, string][] = [["A", t.qOptA], ["B", t.qOptB], ["C", t.qOptC], ["D", t.qOptD]];
    return (
      <section>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 22, flexWrap: "wrap", gap: 16 }}>
          <div><div style={kicker}>{t.navQuestions}</div><h1 style={{ ...h1, fontSize: 28 }}>{t.qTitle}</h1></div>
          <div style={{ display: "flex", gap: 8 }}>{[t.qAll, t.qByLesson, t.qFav].map((f, i) => <span key={i} style={{ ...pill(i === 0), padding: "8px 18px" }}>{f}</span>)}</div>
        </div>
        <div className="mk-grid-2" style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 22, alignItems: "start" }}>
          <div style={{ background: "linear-gradient(150deg,#2D6F8E,#14313F)", borderRadius: 24, padding: 24, boxShadow: "0 22px 48px rgba(20,49,63,0.26)", color: "#fff" }}>
            <div style={{ fontFamily: "var(--display)", fontWeight: 700, fontSize: 15, color: "#DDF4FF", marginBottom: 18 }}>{t.qProgress}</div>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
              <div style={{ width: 150, height: 150, borderRadius: "50%", background: "conic-gradient(#A7D8F0 0% 44%, rgba(255,255,255,0.16) 44% 100%)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ width: 112, height: 112, borderRadius: "50%", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <div style={{ fontFamily: "var(--display)", fontWeight: 900, fontSize: 32, color: "#14313F", lineHeight: 1 }}>{t.n44}%</div>
                </div>
              </div>
            </div>
            <div style={{ textAlign: "center", fontSize: 13, color: "#A7D8F0" }}>{t.qSolved}</div>
          </div>
          <div style={{ ...card, padding: 28 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <span style={{ fontSize: 12, color: "#3E86A6", fontWeight: 600 }}>{t.qMeta}</span>
              <span style={{ background: "#F6E3B4", color: "#9A7B2E", borderRadius: 999, padding: "5px 14px", fontSize: 12, fontWeight: 700 }}>{t.qLevel}</span>
            </div>
            <h2 style={{ fontFamily: "var(--display)", fontSize: 21, color: "#14313F", margin: "0 0 22px", lineHeight: 1.5 }}>{t.qQuestion}</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 22 }}>
              {opts.map(([l, txt]) => {
                const correct = l === "B";
                return (
                  <div key={l} style={{ display: "flex", alignItems: "center", gap: 14, padding: "15px 18px", border: correct ? "2px solid #2D6F8E" : "1px solid #E9F2F7", borderRadius: 16, background: correct ? "#DDF4FF" : "#F7FCFF", cursor: "pointer" }}>
                    <span style={{ width: 28, height: 28, borderRadius: "50%", ...(correct ? { background: "#1F8A6B", color: "#fff" } : { border: "2px solid #DDF4FF", color: "#3E86A6" }), display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, flexShrink: 0 }}>{correct ? <Icon name="check" size={16} sw={2.4} /> : l}</span>
                    <span style={{ fontSize: 15, color: "#14313F", fontWeight: correct ? 700 : 400 }}>{txt}</span>
                  </div>
                );
              })}
            </div>
            <div style={{ display: "flex", gap: 12, background: "#F5FBF9", border: "1px solid #CFEFEA", borderRadius: 16, padding: "16px 20px", fontSize: 14, lineHeight: 1.85, color: "#2D6F8E", marginBottom: 22 }}>
              <div style={{ flexShrink: 0, marginTop: 1 }}><Icon name="info" size={20} sw={1.9} stroke="#1F8A6B" /></div>
              <div><b style={{ color: "#14313F" }}>{t.qExplainLabel}</b> {t.qExplain}</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <button style={{ display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", color: "#3E86A6", fontFamily: "var(--body)", fontSize: 14, fontWeight: 600, cursor: "pointer" }}><Icon name="bookmark" size={17} />{t.qSave}</button>
              <button className="mk-primary" style={{ display: "flex", alignItems: "center", gap: 8, background: "#2D6F8E", border: "none", color: "#fff", borderRadius: 12, padding: "11px 26px", fontFamily: "var(--body)", fontWeight: 700, fontSize: 14, cursor: "pointer", boxShadow: "0 10px 22px rgba(20,49,63,0.22)" }}>{t.qNext}<Icon name="arrow" size={16} sw={2} style={{ transform: arrowFwd }} /></button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  function Cards() {
    const decks: [string, string, boolean][] = [[t.subjCell, t.cards24, true], [t.subjTissues, t.cards18, false], [t.subjBiochem, t.cards22, false]];
    return (
      <section>
        <div style={{ textAlign: "center", marginBottom: 26 }}><div style={kicker}>{t.navCards}</div><h1 style={{ ...h1, fontSize: 28 }}>{t.cardsTitle}</h1></div>
        <div className="mk-grid-2" style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: 22, alignItems: "start" }}>
          <div style={{ ...card, borderRadius: 24, padding: 22 }}>
            <div style={{ ...secTitle, fontSize: 15, marginBottom: 16 }}>{t.decks}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {decks.map(([n, c, sel], i) => (
                <div key={i} style={{ padding: "14px 16px", borderRadius: 16, background: sel ? "#DDF4FF" : "#F7FCFF", border: sel ? "1px solid #A7D8F0" : "1px solid #E9F2F7" }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#14313F" }}>{n}</div>
                  <div style={{ fontSize: 12, color: sel ? "#2D6F8E" : "#3E86A6", marginTop: 2 }}>{c}</div>
                </div>
              ))}
              <button className="mk-add" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7, marginTop: 6, background: "none", border: "1px dashed #A7D8F0", color: "#2D6F8E", borderRadius: 16, padding: 12, fontFamily: "var(--body)", fontWeight: 700, fontSize: 13, cursor: "pointer" }}><Icon name="plus" size={16} />{t.newDeck}</button>
            </div>
          </div>
          <div>
            <div onClick={() => setFlipped((f) => !f)} style={{ position: "relative", height: 340, borderRadius: 28, background: "linear-gradient(135deg,#fff,#F7FCFF)", border: "1px solid #E9F2F7", boxShadow: "0 24px 55px rgba(45,111,142,0.1)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 40, textAlign: "center", cursor: "pointer" }}>
              <span style={{ position: "absolute", top: 22, insetInlineEnd: 26, background: "#DDF4FF", color: "#2D6F8E", borderRadius: 999, padding: "5px 14px", fontSize: 12, fontWeight: 700 }}>{flipped ? t.sideA : t.sideQ}</span>
              <div style={{ fontFamily: "var(--display)", fontSize: 26, fontWeight: 800, color: "#14313F", lineHeight: 1.5, marginBottom: 14 }}>{flipped ? t.cardA : t.cardQ}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13, color: "#6CB7D8" }}><Icon name="refresh" size={16} />{t.tapToFlip}</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 22 }}>
              <button className="mk-ctrl" style={{ width: 52, height: 52, borderRadius: 16, background: "#fff", border: "1px solid #E9F2F7", color: "#2D6F8E", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="back" size={20} sw={2} style={{ transform: arrowBack }} /></button>
              <div style={{ textAlign: "center" }}><div style={{ fontSize: 13, color: "#3E86A6", fontWeight: 600 }}>{t.cardCount}</div><div style={{ width: 180, height: 7, borderRadius: 20, background: "#E9F2F7", overflow: "hidden", marginTop: 8 }}><div style={{ width: "33%", height: "100%", background: "#2D6F8E", borderRadius: 20 }} /></div></div>
              <button className="mk-primary" style={{ width: 52, height: 52, borderRadius: 16, background: "#2D6F8E", border: "none", color: "#fff", cursor: "pointer", boxShadow: "0 10px 22px rgba(20,49,63,0.22)", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="arrow" size={20} sw={2} style={{ transform: arrowFwd }} /></button>
            </div>
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
              <div><div style={{ ...secTitle, fontSize: 16 }}>{t.navAssistant}</div><div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#1F8A6B", fontWeight: 600 }}><span style={{ width: 7, height: 7, borderRadius: "50%", background: "#1F8A6B", display: "inline-block" }} />{t.online}</div></div>
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
    const leaf = (txt: string) => <div style={{ background: "#F7FCFF", border: "1px solid #DDF4FF", color: "#14313F", borderRadius: 12, padding: "10px 22px", fontSize: 13.5, fontWeight: 600 }}>{txt}</div>;
    const conn = (h: number) => <div style={{ width: 2, height: h, background: "#DDF4FF" }} />;
    return (
      <section>
        <div style={{ textAlign: "center", marginBottom: 14 }}><div style={kicker}>{t.navMap}</div><h1 style={h1}>{t.mapTitle}</h1><p style={{ margin: "8px 0 0", fontSize: 15, color: "#2D6F8E" }}>{t.mapSub}</p></div>
        <div style={{ ...card, padding: "44px 24px", marginTop: 22 }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{ background: "linear-gradient(150deg,#2D6F8E,#14313F)", color: "#fff", borderRadius: 18, padding: "16px 30px", textAlign: "center", boxShadow: "0 16px 34px rgba(20,49,63,0.22)" }}>
              <div style={{ fontFamily: "var(--display)", fontWeight: 800, fontSize: 20 }}>{t.mapRoot}</div>
              <div style={{ fontSize: 12, color: "#A7D8F0", marginTop: 3 }}>{t.mapRootSub}</div>
            </div>
            {conn(28)}
            <div style={{ position: "relative", display: "flex", gap: 64, justifyContent: "center", flexWrap: "wrap" }}>
              <div style={{ position: "absolute", top: 0, left: "25%", right: "25%", height: 2, background: "#DDF4FF" }} />
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                {conn(28)}
                <div style={{ background: "#DDF4FF", color: "#2D6F8E", borderRadius: 14, padding: "11px 24px", fontFamily: "var(--display)", fontWeight: 700, fontSize: 15 }}>{t.mapB1}</div>
                {conn(20)}
                <div style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "center" }}>{leaf(t.mapL1)}{leaf(t.mapL2)}{leaf(t.mapL3)}</div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                {conn(28)}
                <div style={{ background: "#CFEFEA", color: "#1F8A6B", borderRadius: 14, padding: "11px 24px", fontFamily: "var(--display)", fontWeight: 700, fontSize: 15 }}>{t.mapB2}</div>
                {conn(20)}
                <div style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "center" }}>{leaf(t.mapL4)}{leaf(t.mapL5)}{leaf(t.mapL6)}</div>
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
                <div style={{ width: 104, height: 104, borderRadius: "50%", background: "conic-gradient(#A7D8F0 0% 68%, rgba(255,255,255,0.16) 68% 100%)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 8 }}><div style={{ width: 78, height: 78, borderRadius: "50%", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--inter)", fontWeight: 900, fontSize: 22, color: "#14313F" }}>{t.n68}</div></div>
                <div style={{ fontSize: 11, color: "#A7D8F0" }}>{t.todayProgress}</div>
              </div>
              {[[t.subjCell, "75%"], [t.subjTissues, "40%"]].map(([n, w], i) => (
                <div key={i} style={{ background: "#fff", border: "1px solid #E9F2F7", borderRadius: 16, padding: 13 }}><div style={{ fontSize: 12.5, fontWeight: 700, color: "#14313F" }}>{n}</div><div style={{ height: 6, borderRadius: 20, background: "#E9F2F7", overflow: "hidden", marginTop: 8 }}><div style={{ width: w, height: "100%", background: "#2D6F8E" }} /></div></div>
              ))}
            </div>
            <div style={{ display: "flex", justifyContent: "space-around", padding: "14px 10px", borderTop: "1px solid #E9F2F7", background: "#fff" }}>{[0, 1, 2, 3].map((i) => <span key={i} style={{ width: 22, height: 22, borderRadius: 7, background: i === 0 ? "#2D6F8E" : "#DDF4FF" }} />)}</div>
          </>)}
          {phone(<>
            <div style={{ padding: "26px 18px 14px", display: "flex", alignItems: "center", gap: 9 }}><div style={{ fontFamily: "var(--display)", fontWeight: 800, fontSize: 14, color: "#14313F" }}>{t.mbLesson}</div><div style={{ marginInlineStart: "auto", background: "#DDF4FF", color: "#2D6F8E", borderRadius: 999, padding: "3px 10px", fontSize: 10, fontWeight: 700 }}>{t.lessonMeta}</div></div>
            <div style={{ flex: 1, overflow: "hidden", padding: "6px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ height: 120, borderRadius: 16, background: "linear-gradient(135deg,#F7FCFF,#DDF4FF)", border: "1px solid #DDF4FF", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="cell" size={40} sw={1.5} stroke="#6CB7D8" /></div>
              <div style={{ fontFamily: "var(--display)", fontWeight: 800, fontSize: 15, color: "#14313F" }}>{t.lessonTitle}</div>
              <div style={{ height: 8, borderRadius: 20, background: "#E9F2F7" }} /><div style={{ height: 8, borderRadius: 20, background: "#E9F2F7", width: "88%" }} /><div style={{ height: 8, borderRadius: 20, background: "#E9F2F7", width: "75%" }} />
              <div style={{ background: "#F7FCFF", border: "1px solid #DDF4FF", borderRadius: 14, padding: 12, fontSize: 11, color: "#2D6F8E", lineHeight: 1.6 }}><b style={{ color: "#14313F" }}>{t.keyLabel}</b></div>
            </div>
            <div style={{ padding: "12px 16px", background: "#fff", borderTop: "1px solid #E9F2F7" }}><div style={{ background: "#2D6F8E", color: "#fff", borderRadius: 12, padding: 11, textAlign: "center", fontSize: 12.5, fontWeight: 700 }}>{t.next}</div></div>
          </>)}
          {phone(<>
            <div style={{ padding: "26px 18px 14px", display: "flex", alignItems: "center", gap: 9 }}><div style={{ fontFamily: "var(--display)", fontWeight: 800, fontSize: 14, color: "#14313F" }}>{t.mbQuiz}</div><div style={{ marginInlineStart: "auto", fontSize: 11, color: "#3E86A6", fontWeight: 600 }}>1 / 250</div></div>
            <div style={{ flex: 1, overflow: "hidden", padding: "6px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ fontFamily: "var(--display)", fontWeight: 700, fontSize: 14, color: "#14313F", lineHeight: 1.5 }}>{t.qQuestion}</div>
              <div style={{ border: "1px solid #E9F2F7", background: "#fff", borderRadius: 12, padding: 11, fontSize: 12, color: "#14313F", display: "flex", gap: 9, alignItems: "center" }}><span style={{ width: 20, height: 20, borderRadius: "50%", border: "2px solid #DDF4FF", flexShrink: 0 }} />{t.qOptA}</div>
              <div style={{ border: "2px solid #2D6F8E", background: "#DDF4FF", borderRadius: 12, padding: 11, fontSize: 12, color: "#14313F", fontWeight: 700, display: "flex", gap: 9, alignItems: "center" }}><span style={{ width: 20, height: 20, borderRadius: "50%", background: "#1F8A6B", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="check" size={12} sw={3} stroke="#fff" /></span>{t.qOptB}</div>
              <div style={{ border: "1px solid #E9F2F7", background: "#fff", borderRadius: 12, padding: 11, fontSize: 12, color: "#14313F", display: "flex", gap: 9, alignItems: "center" }}><span style={{ width: 20, height: 20, borderRadius: "50%", border: "2px solid #DDF4FF", flexShrink: 0 }} />{t.qOptC}</div>
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
