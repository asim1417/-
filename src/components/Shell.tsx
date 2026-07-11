"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Footer from "./Footer";
import { IconHome, IconCompass, IconKey, IconQuiz, IconRobot } from "./icons";

const TABS = [
  { href: "/", Icon: IconHome, label: "الرئيسية" },
  { href: "/paths", Icon: IconCompass, label: "مساري" },
  { href: "/keys", Icon: IconKey, label: "المفاتيح" },
  { href: "/quiz", Icon: IconQuiz, label: "الأسئلة" },
  { href: "/assistant", Icon: IconRobot, label: "المرشد" },
];

export default function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const [dark, setDark] = useState(false);
  useEffect(() => { document.documentElement.setAttribute("data-theme", dark ? "dark" : "light"); }, [dark]);
  const isActive = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));
  const isAdmin = path.startsWith("/admin") || path.startsWith("/login");

  return (
    <div className="app">
      <div className="topbar">
        <Link href="/" className="brand">
          <img src="/brand/medkey-symbol.svg" alt="مِفتاح الطب" />
          <span className="bt"><b>مِفتاح الطب</b><span>MEDKEY GULF</span></span>
        </Link>
        <button className="icon-btn" onClick={() => setDark((d) => !d)} title="الوضع الليلي">{dark ? "☀️" : "🌙"}</button>
      </div>

      {children}
      {!isAdmin && <Footer />}

      {!isAdmin && (
        <nav className="tabbar">
          {TABS.map(({ href, Icon, label }) => (
            <Link key={href} href={href} className={`tab ${isActive(href) ? "active" : ""}`}>
              <span className="ti"><Icon /></span>{label}
            </Link>
          ))}
        </nav>
      )}
    </div>
  );
}
