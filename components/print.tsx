"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Printer } from "lucide-react";
import { useT } from "@/lib/i18n";
import { Button } from "@/components/common";
import { LogoMark } from "@/components/logo";

// The paper version: the clinic's name and logo, a title, who it is about, and when it was printed.
// It is put straight into <body>, and the print styles in globals.css hide everything else on paper.
function PrintSheet({ title, subject, children }: { title: string; subject: string; children: ReactNode }) {
  const { t, locale } = useT();
  const printedAt = new Intl.DateTimeFormat(locale === "ar" ? "ar-IQ-u-nu-latn" : "en-GB", { dateStyle: "long", timeStyle: "short" }).format(new Date());
  return createPortal(
    <div className="print-root" dir={locale === "ar" ? "rtl" : "ltr"}>
      <header className="mb-6 flex items-center justify-between gap-4 border-b-2 border-[#0f766e] pb-4">
        <div className="flex items-center gap-3">
          <LogoMark size={44} />
          <div>
            <p className="text-xl font-bold">{t("app.name")}</p>
            <p className="text-sm text-[#475569]">{t("print.address")}</p>
          </div>
        </div>
        <div className="text-end">
          <p className="text-lg font-bold">{title}</p>
          <p className="text-sm text-[#475569]">{subject}</p>
        </div>
      </header>
      <main className="space-y-5">{children}</main>
      <footer className="mt-8 border-t border-[#cbd5e1] pt-3 text-xs text-[#64748b]">{t("print.footer", { date: printedAt })}</footer>
    </div>,
    document.body,
  );
}

// A section on the paper: a heading and its content, kept together on one page when possible.
export function PrintSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="print-keep space-y-2">
      <h2 className="border-b border-[#cbd5e1] pb-1 text-base font-bold">{title}</h2>
      {children}
    </section>
  );
}

// The "Print / Save PDF" button. Pressing it builds the paper version, opens the browser's print window,
// and removes the paper version when the window closes. Choosing "Save as PDF" there gives a PDF file.
export function PrintButton({ title, subject, children, label }: { title: string; subject: string; children: () => ReactNode; label?: string }) {
  const { t } = useT();
  const [printing, setPrinting] = useState(false);

  useEffect(() => {
    if (!printing) return;
    const html = document.documentElement;
    // Paper is always white, so night mode is switched off while printing and put back after.
    const wasDark = html.classList.contains("dark");
    html.classList.remove("dark");
    const done = () => {
      if (wasDark) html.classList.add("dark");
      setPrinting(false);
    };
    window.addEventListener("afterprint", done, { once: true });
    // The paper version is already in the page when this runs. The timer lets the night-mode change apply first.
    const timer = setTimeout(() => window.print(), 0);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("afterprint", done);
    };
  }, [printing]);

  return (
    <>
      <Button type="button" variant="secondary" onClick={() => setPrinting(true)} data-print-button>
        <Printer className="size-4" aria-hidden />
        {label ?? t("print.button")}
      </Button>
      {printing && (
        <PrintSheet title={title} subject={subject}>
          {children()}
        </PrintSheet>
      )}
    </>
  );
}
