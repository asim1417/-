import Link from "next/link";
import { COURSES, LESSONS } from "@/lib/curriculum";

export default function Paths() {
  return (
    <main className="screen">
      <div className="eyebrow">مساري التعليمي</div>
      <h2 className="h-lg">{COURSES.length} مسارًا تأسيسيًا</h2>
      <p className="muted" style={{ fontSize: 13 }}>مبنيّ على معايير SaudiMED وWFME — من التفكير الطبي حتى استراتيجية الاختبار.</p>
      <div className="section-title">المكتبة الكاملة</div>
      <div className="paths">
        {COURSES.map((c) => {
          const first = LESSONS.find((l) => l.courseSlug === c.slug);
          const inner = (
            <>
              <div className="ic">{c.icon}</div>
              <h4>{c.title}</h4>
              <small>{c.titleAr}{first ? " · متاح" : " · قريبًا"}</small>
            </>
          );
          return first
            ? <Link key={c.slug} className="path" href={`/lessons/${first.slug}`}>{inner}</Link>
            : <div key={c.slug} className="path" style={{ opacity: .6 }}>{inner}</div>;
        })}
      </div>
    </main>
  );
}
