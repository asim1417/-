import type { Metadata } from "next";
import { Inter, Noto_Kufi_Arabic, Noto_Sans_Arabic } from "next/font/google";
import "./globals.css";
import { LangProvider } from "@/lib/i18n";

const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800", "900"], variable: "--font-inter", display: "swap" });
const kufi = Noto_Kufi_Arabic({ subsets: ["arabic"], weight: ["400", "500", "600", "700", "800", "900"], variable: "--font-kufi", display: "swap" });
const sansAr = Noto_Sans_Arabic({ subsets: ["arabic"], weight: ["400", "500", "600", "700", "800"], variable: "--font-sans-ar", display: "swap" });

export const metadata: Metadata = {
  title: "MedKey Gulf · مِفتاح الطب",
  description: "Unlock medicine from the very first year — a foundational medical-learning platform for first-year students across the Gulf.",
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" dir="ltr" className={`${inter.variable} ${kufi.variable} ${sansAr.variable}`}>
      <body>
        <LangProvider>{children}</LangProvider>
      </body>
    </html>
  );
}
