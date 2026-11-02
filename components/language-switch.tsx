"use client";

import { AnimatePresence, motion } from "motion/react";
import { setLocale, useT } from "@/lib/i18n";
import { fadeSwitch } from "@/lib/view-transition";

export function LanguageSwitch({ className = "" }: { className?: string }) {
  const { t, locale } = useT();
  return (
    <motion.button
      type="button"
      onClick={() => fadeSwitch(() => setLocale(locale === "ar" ? "en" : "ar"))}
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.92 }}
      className={`inline-flex h-8 items-center gap-1.5 overflow-hidden rounded-lg border border-slate-300 bg-white px-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 ${className}`}
    >
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={locale}
          initial={{ y: 14, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -14, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 24 }}
        >
          {t("lang.switch")}
        </motion.span>
      </AnimatePresence>
    </motion.button>
  );
}
