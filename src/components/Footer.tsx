import Link from "next/link";
export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="med-note">🛡️ منصة تعليمية فقط — لا تقدّم تشخيصًا أو علاجًا لأي حالة حقيقية.</div>
      <nav>
        <Link href="/legal#privacy">الخصوصية (PDPL)</Link>
        <Link href="/legal#terms">الشروط</Link>
        <Link href="/legal#disclaimer">إخلاء المسؤولية</Link>
        <Link href="/legal#accessibility">إتاحة الوصول</Link>
      </nav>
      <small>© {new Date().getFullYear()} مِفتاح الطب · MedKey Gulf</small>
      <style>{`
        .site-footer{padding:20px 18px 4px;text-align:center}
        .med-note{background:var(--mint);border:1px solid var(--line);border-radius:12px;padding:10px 12px;font-size:11.5px;color:var(--slate)}
        .site-footer nav{display:flex;flex-wrap:wrap;gap:10px;justify-content:center;margin-top:12px}
        .site-footer nav a{font-size:11.5px;color:var(--primary);text-decoration:none}
        .site-footer small{display:block;margin-top:12px;font-size:10.5px;color:var(--slate)}
      `}</style>
    </footer>
  );
}
