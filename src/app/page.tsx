import Link from "next/link";
import { KEYS, LESSONS, COURSES } from "@/lib/curriculum";

export default function Home() {
  const key = KEYS[0];
  const featured = LESSONS.filter((l) => ["homeostasis", "resting-membrane-potential", "cell-hierarchy"].includes(l.slug));
  return (
    <main className="screen">
      <section className="hero">
        <div className="k">افهم الطب<br />من مفاتيحه، لا من تفاصيله.</div>
        <p>نفهمك الطب من جذوره — مفاهيم كبرى، ربط سريري مبكر، وتكرار ذكي.</p>
        <Link className="cta" href={`/lessons/${featured[0]?.slug ?? "homeostasis"}`}>ابدأ درس اليوم ←</Link>
      </section>

      <div className="keyday">
        <span className="tag">🗝 مفتاح اليوم</span>
        <h3>{key.ar}</h3>
        <div className="en">{key.en}</div>
        <p>{key.summary}</p>
      </div>

      <div className="stats">
        <div className="stat"><b>{LESSONS.length}</b><span>درسًا متاحًا</span></div>
        <div className="stat"><b>{KEYS.length}</b><span>مفتاحًا كليًا</span></div>
        <div className="stat"><b>{COURSES.length}</b><span>مسارًا</span></div>
      </div>

      <div className="section-title">ابدأ رحلتك</div>
      <div className="paths">
        <Link className="path feat" href="/placement">
          <div className="ic">🎯</div>
          <h4>حدّد مستواك</h4>
          <small>اختبار قصير يوجّهك لنقطة البداية</small>
        </Link>
        <Link className="path feat" href="/flashcards">
          <div className="ic">🃏</div>
          <h4>بطاقات SM-2</h4>
          <small>تكرار متباعد يرسّخ ما تعلّمت</small>
        </Link>
      </div>

      <div className="section-title">دروس مختارة <Link href="/paths">كل المسارات</Link></div>
      <div className="paths">
        {featured.map((l) => (
          <Link key={l.slug} className="path" href={`/lessons/${l.slug}`}>
            <div className="ic">{COURSES.find((c) => c.slug === l.courseSlug)?.icon ?? "📘"}</div>
            <h4>{l.titleEn}</h4>
            <small>{l.title}</small>
          </Link>
        ))}
      </div>
    </main>
  );
}
