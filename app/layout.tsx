import type { Metadata } from "next";
import { IBM_Plex_Sans_Arabic } from "next/font/google";
import { OfflineBar, ServiceWorkerSetup } from "@/components/offline-bar";
import { Toaster } from "@/components/toaster";
import { bootScript, DEFAULT_LOCALE } from "@/lib/boot";
import { LocaleSync } from "@/lib/i18n";
import { ThemeSync } from "@/lib/theme";
import "./globals.css";

const plexArabic = IBM_Plex_Sans_Arabic({
  variable: "--font-plex-arabic",
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "مجمع الرحمة الطبي | Al-Rahma Medical Complex",
  description: "احجز موعدك وتابع دورك وملفك الطبي. Book your visit and follow your turn and medical file.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang={DEFAULT_LOCALE} dir="rtl" className={`${plexArabic.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: bootScript }} />
      </head>
      <body className="min-h-full font-sans">
        <LocaleSync />
        <ThemeSync />
        {children}
        <OfflineBar />
        <ServiceWorkerSetup />
        <Toaster />
      </body>
    </html>
  );
}
