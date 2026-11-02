"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, useMotionValueEvent, useScroll } from "motion/react";
import { LayoutDashboard, LogIn, UserRound } from "lucide-react";
import { homeFor, useIsPatient, useIsStaff, useSession } from "@/lib/auth";
import { useT, type MessageKey } from "@/lib/i18n";
import { LanguageSwitch } from "@/components/language-switch";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";

const LINKS: { href: string; label: MessageKey }[] = [
  { href: "#how", label: "landing.nav.how" },
  { href: "#doctors", label: "landing.nav.doctors" },
];

export function Navbar() {
  const { t } = useT();
  const { session } = useSession();
  const isStaff = useIsStaff();
  const isPatient = useIsPatient();
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);
  useMotionValueEvent(scrollY, "change", (y) => setScrolled(y > 12));

  return (
    <motion.header
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6 }}
      className={`fixed inset-x-0 top-0 z-40 transition-colors duration-300 ${
        scrolled ? "border-b border-slate-200/70 bg-white/85 shadow-sm backdrop-blur-md" : "bg-transparent"
      }`}
    >
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 md:px-8">
        <Link href="/" className="text-xl">
          <Logo size={36} />
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
            >
              {t(l.label)}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <LanguageSwitch />
          <Link
            href={isPatient ? "/account" : "/account/login"}
            aria-label={isPatient ? t("landing.nav.account") : t("landing.nav.customer")}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-brand-700"
          >
            <UserRound className="h-4 w-4" aria-hidden />
            <span className="hidden sm:inline">{isPatient ? t("landing.nav.account") : t("landing.nav.customer")}</span>
          </Link>
          <Link
            href={isStaff && session ? homeFor(session.user.role) : "/login"}
            aria-label={isStaff ? t("landing.nav.dashboard") : t("landing.nav.staff")}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-medium text-slate-50 transition-colors hover:bg-slate-700"
          >
            {isStaff ? (
              <LayoutDashboard className="h-4 w-4" aria-hidden />
            ) : (
              <LogIn className="h-4 w-4 rtl:rotate-180" aria-hidden />
            )}
            <span className="hidden sm:inline">{isStaff ? t("landing.nav.dashboard") : t("landing.nav.staff")}</span>
          </Link>
        </div>
      </nav>
    </motion.header>
  );
}
