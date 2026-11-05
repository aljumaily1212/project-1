"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { Ban, Clock, FileQuestion, Hourglass, LockKeyhole, RotateCw, ServerCrash, TriangleAlert, Wrench, type LucideIcon } from "lucide-react";
import type { ErrorCode } from "@/lib/error-codes";
import { useT, type MessageKey } from "@/lib/i18n";
import { LanguageSwitch } from "@/components/language-switch";
import { LogoMark, Wordmark } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { TextSizeToggle } from "@/components/text-size-toggle";
import { buttonClass } from "@/components/common";


// Each error page gets a picture, a title and a short explanation.
const ICON: Record<ErrorCode, LucideIcon> = {
  400: TriangleAlert,
  401: LockKeyhole,
  403: Ban,
  404: FileQuestion,
  408: Clock,
  429: Hourglass,
  500: ServerCrash,
  503: Wrench,
};

// Errors that may go away on their own: these pages offer "try again".
const CAN_RETRY: ErrorCode[] = [408, 429, 500, 503];

// A full page for an error, in the site's design: the logo, a big error number, what happened, and a way out.
// onRetry replaces the normal "try again" (a page reload), for example to re-draw a page that crashed.
export function ErrorScreen({ code, onRetry }: { code: ErrorCode; onRetry?: () => void }) {
  const { t } = useT();
  const Icon = ICON[code];
  const retry = onRetry ?? (() => window.location.reload());

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-16" data-error={code}>
      {/* Soft brand-colored glow behind the card. */}
      <div aria-hidden className="pointer-events-none absolute -top-32 start-1/2 size-[28rem] -translate-x-1/2 rounded-full bg-brand-500/10 blur-3xl rtl:translate-x-1/2" />

      <div className="absolute top-4 end-4 flex gap-2">
        <TextSizeToggle />
        <ThemeToggle />
        <LanguageSwitch />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="relative w-full max-w-md text-center"
      >
        <Link href="/" className="inline-flex items-center gap-2 text-lg">
          <LogoMark size={36} className="rounded-xl shadow-md shadow-brand-600/30" />
          <Wordmark />
        </Link>

        <div className="mt-10 rounded-3xl border border-slate-200 bg-white px-6 py-10 shadow-sm">
          <div className="relative mx-auto mb-6 flex size-20 items-center justify-center">
            <span aria-hidden className="absolute inset-0 rounded-full bg-brand-50" />
            <Icon className="relative size-9 text-brand-600" aria-hidden />
          </div>
          {/* The number is a picture of the error; the title says it in words. */}
          <p dir="ltr" aria-hidden className="bg-gradient-to-b from-brand-500 to-brand-800 bg-clip-text text-6xl font-extrabold tracking-tight text-transparent">
            {code}
          </p>
          <h1 className="mt-3 text-xl font-semibold">{t(`errorPage.${code}.title` as MessageKey)}</h1>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-slate-500">{t(`errorPage.${code}.text` as MessageKey)}</p>

          <div className="mt-8 flex flex-wrap justify-center gap-2">
            {/* The home page is also the sign-in page, so 401 just names it differently. */}
            <Link href="/" className={buttonClass("primary", "h-10 px-5", "default")}>
              {t(code === 401 ? "errorPage.signIn" : "errorPage.home")}
            </Link>
            {CAN_RETRY.includes(code) ? (
              <button type="button" onClick={retry} className={buttonClass("secondary", "h-10 px-5", "default")}>
                <RotateCw className="size-4" aria-hidden />
                {t("errorPage.retry")}
              </button>
            ) : (
              <button type="button" onClick={() => window.history.back()} className={buttonClass("secondary", "h-10 px-5", "default")}>
                {t("errorPage.back")}
              </button>
            )}
          </div>
        </div>

        <p className="mt-6 text-xs text-slate-500">{t("errorPage.help")}</p>
      </motion.div>
    </main>
  );
}
