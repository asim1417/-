import type { Metadata } from "next";
import { Noto_Kufi_Arabic, Noto_Sans_Arabic, Inter } from "next/font/google";
import "./globals.css";
import Shell from "@/components/Shell";

// خطوط هوية MedKey Gulf
const display = Noto_Kufi_Arabic({ subsets: ["arabic"], weight: ["400", "500", "600", "700", "800"], variable: "--font-display", display: "swap" });
const body = Noto_Sans_Arabic({ subsets: ["arabic"], weight: ["300", "400", "500", "600", "700"], variable: "--font-body", display: "swap" });
const en = Inter({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-en", display: "swap" });

export const metadata: Metadata = {
  title: "مِفتاح الطب · MedKey Gulf",
  description: "نفهمك الطب من جذوره — منصة تعليم طبي تأسيسي لطلاب السنة الأولى في السعودية والخليج.",
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className={`${display.variable} ${body.variable} ${en.variable}`}>
      <body>
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
