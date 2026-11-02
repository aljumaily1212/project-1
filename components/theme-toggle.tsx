"use client";

import { AnimatePresence, motion } from "motion/react";
import { Moon, Sun } from "lucide-react";
import { useT } from "@/lib/i18n";
import { setTheme, useTheme } from "@/lib/theme";
import { circleSwitch } from "@/lib/view-transition";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { t } = useT();
  const theme = useTheme();
  const next = theme === "dark" ? "light" : "dark";
  const label = next === "dark" ? t("theme.toDark") : t("theme.toLight");

  function onClick(e: React.MouseEvent<HTMLButtonElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    circleSwitch(() => setTheme(next), r.left + r.width / 2, r.top + r.height / 2);
  }

  return (
    <motion.button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.88 }}
      className={`relative inline-flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 ${className}`}
    >
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={next}
          initial={{ rotate: -120, scale: 0, opacity: 0 }}
          animate={{ rotate: 0, scale: 1, opacity: 1 }}
          exit={{ rotate: 120, scale: 0, opacity: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 18 }}
          className="flex"
        >
          {next === "dark" ? <Moon className="h-4 w-4" aria-hidden /> : <Sun className="h-4 w-4" aria-hidden />}
        </motion.span>
      </AnimatePresence>
    </motion.button>
  );
}
