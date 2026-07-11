import Link from "next/link";
import { KEYS, LESSONS } from "@/lib/curriculum";

export default function Keys() {
  const lessonForKey = (i: number) => LESSONS.find((l) => l.conceptSlugs.includes(`key-${i}`));
  return (
    <main className="screen">
      <div className="eyebrow">مفاتيح الطب</div>
      <h2 className="h-lg">{KEYS.length} مفتاحًا كليًا</h2>
      <p className="muted" style={{ fontSize: 13 }}>إذا أتقنتها فهمت حقيقة العلم — لا الحفظ المبعثر.</p>
      <div style={{ marginTop: 16 }}>
        {KEYS.map((k) => {
          const l = lessonForKey(k.index);
          const body = (<><div className="key-num">{k.index}</div><div><div className="en">{k.en}</div><div className="ar">{k.ar}</div></div></>);
          return l
            ? <Link key={k.index} className="key-item" href={`/lessons/${l.slug}`}>{body}</Link>
            : <div key={k.index} className="key-item" style={{ cursor: "default" }}>{body}</div>;
        })}
      </div>
    </main>
  );
}
