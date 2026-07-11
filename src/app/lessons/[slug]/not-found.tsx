import Link from "next/link";
export default function NotFound() {
  return (
    <main className="screen">
      <h2 className="h-lg">الدرس غير موجود</h2>
      <p className="muted" style={{ fontSize: 13 }}>ربما لم يُنشر بعد. تصفّح المسارات المتاحة.</p>
      <Link className="cta teal" href="/paths" style={{ marginTop: 14 }}>عرض المسارات ←</Link>
    </main>
  );
}
