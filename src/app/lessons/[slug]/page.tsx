import Link from "next/link";
import { notFound } from "next/navigation";
import { LESSONS, COURSES, SOURCE_SEEDS } from "@/lib/curriculum";

export function generateStaticParams() {
  return LESSONS.map((l) => ({ slug: l.slug }));
}

export default async function LessonPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const l = LESSONS.find((x) => x.slug === slug);
  if (!l) notFound();
  const course = COURSES.find((c) => c.slug === l.courseSlug);

  return (
    <main className="screen">
      <Link className="back-btn" href="/">→ رجوع</Link>
      <div className="eyebrow">{course?.title} · درس {l.order}</div>
      <h2 style={{ fontSize: 20, margin: "4px 0 4px" }}>{l.title}</h2>
      <div className="en" style={{ color: "var(--gold)", fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 13 }}>{l.titleEn}</div>

      <div className="lesson-block"><div className="lb-head"><span className="n">?</span> لماذا يهمّ هذا؟</div><p>{l.whyItMatters}</p></div>
      <div className="lesson-block"><div className="lb-head"><span className="n">💡</span> الفكرة الكبرى</div><p>{l.bigIdea}</p></div>
      <div className="lesson-block"><div className="lb-head"><span className="n">📖</span> شرح مبسّط</div><p>{l.explanationAr}</p></div>

      <div className="lesson-block"><div className="lb-head"><span className="n">🗺</span> {l.map.title}</div>
        <div className="map">
          {l.map.nodes.map((n, i) => (<span key={i}>{i > 0 && <span className="arrow"> ← </span>}<span className="node">{n}</span></span>))}
        </div>
      </div>

      <div className="lesson-block"><div className="lb-head"><span className="n">🔤</span> مصطلحات مهمة</div>
        <div className="chips">{l.terms.map((t) => <span key={t.en} className="chip en" title={t.meaning}>{t.en}</span>)}</div>
      </div>

      <div className="lesson-block"><div className="lb-head"><span className="n">🩺</span> ربط سريري مبكر</div><p>{l.clinical}</p></div>

      <div className="lesson-block"><div className="lb-head"><span className="n">⭐</span> نقاط عالية العائد</div>
        <div className="hy"><ul>{l.highYieldPoints.map((p, i) => <li key={i}>{p}</li>)}</ul></div>
      </div>

      <div className="lesson-block"><div className="lb-head"><span className="n">⚠️</span> أخطاء شائعة</div>
        {l.commonMistakes.map((m, i) => <div key={i} className="mistake">✕ {m}</div>)}
      </div>

      <div className="lesson-block"><div className="lb-head"><span className="n">⏱</span> ملخص 60 ثانية</div><p>{l.summary60}</p></div>

      <Link className="cta full teal" href="/quiz">اختبر فهمك الآن ←</Link>
      <p className="src-note">
        المصادر: {l.sources.map((s) => SOURCE_SEEDS.find((x) => x.externalId === s)?.title.split("—")[0].trim()).filter(Boolean).join(" · ")} — شرح أصلي مع إحالة.
      </p>
    </main>
  );
}
