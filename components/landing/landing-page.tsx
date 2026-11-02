"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { CalendarCheck, Clock, FileHeart, Stethoscope } from "lucide-react";
import { api } from "@/lib/api";
import { resetMockData } from "@/lib/api/mock";
import { USE_MOCK } from "@/lib/config";
import { doctorBranch, doctorName, doctorSpecialty, money } from "@/lib/display";
import { errorText, useT } from "@/lib/i18n";
import { useLoad } from "@/lib/useLoad";
import { Button, Card, ErrorState, buttonClass } from "@/components/common";
import { CardsSkeleton } from "@/components/skeleton";
import { Navbar } from "./navbar";

const STEPS = [
  { icon: CalendarCheck, title: "landing.how.step1.title", body: "landing.how.step1.body" },
  { icon: Clock, title: "landing.how.step2.title", body: "landing.how.step2.body" },
  { icon: FileHeart, title: "landing.how.step3.title", body: "landing.how.step3.body" },
] as const;

function Hero() {
  const { t } = useT();
  return (
    <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 pt-28 pb-16 md:grid-cols-2 md:px-8 md:pt-36">
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="space-y-6">
        <span className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700">
          <span className="size-2 rounded-full bg-brand-500" aria-hidden />
          {t("landing.hero.eyebrow")}
        </span>
        <h1 className="text-4xl font-bold leading-tight tracking-tight md:text-5xl">
          {t("landing.hero.title1")}
          <span className="block text-brand-600 dark:text-brand-300">{t("landing.hero.title2")}</span>
        </h1>
        <p className="max-w-md text-slate-600">{t("landing.hero.subtitle")}</p>
        <div className="flex flex-wrap gap-3">
          <Link href="/account" className={buttonClass("primary", "h-11 px-5", "default")}>
            <CalendarCheck aria-hidden />
            {t("landing.hero.cta")}
          </Link>
          <a href="#doctors" className={buttonClass("secondary", "h-11 px-5", "default")}>
            <Stethoscope aria-hidden />
            {t("landing.hero.secondary")}
          </a>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, delay: 0.15 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#6366f1] to-[#7c3aed] p-6 shadow-xl shadow-brand-600/30"
      >
        <div className="tape-stripes absolute inset-0" aria-hidden />
        <div className="relative space-y-4 rounded-2xl bg-[#0f172a]/80 p-6 text-[#f8fafc]">
          <p className="text-sm opacity-80">{t("landing.ticket.title")}</p>
          <p className="text-6xl font-bold" dir="ltr">
            A-07
          </p>
          <p className="font-medium">{t("landing.ticket.doctor")}</p>
          <div className="flex items-center justify-between gap-3 rounded-lg bg-white/10 px-3 py-2 text-sm">
            <span>{t("landing.ticket.ahead")}</span>
            <span className="opacity-80">{t("landing.ticket.next")}</span>
          </div>
        </div>
      </motion.div>
    </section>
  );
}

function HowItWorks() {
  const { t } = useT();
  return (
    <section id="how" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-14 md:px-8">
      <h2 className="mb-8 text-center text-2xl font-bold">{t("landing.how.title")}</h2>
      <div className="grid gap-4 md:grid-cols-3">
        {STEPS.map(({ icon: Icon, title, body }, index) => (
          <Card key={title}>
            <span className="mb-4 inline-flex size-10 items-center justify-center rounded-lg bg-brand-100 text-brand-700">
              <Icon className="size-5" aria-hidden />
            </span>
            <h3 className="mb-1 font-semibold">
              {index + 1}. {t(title)}
            </h3>
            <p className="text-sm text-slate-600">{t(body)}</p>
          </Card>
        ))}
      </div>
    </section>
  );
}

function Doctors() {
  const { t, locale } = useT();
  const { state, reload } = useLoad(api.listDoctors);
  return (
    <section id="doctors" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-14 md:px-8">
      <h2 className="mb-8 text-center text-2xl font-bold">{t("landing.doctors.title")}</h2>
      {state.status === "loading" && <CardsSkeleton count={2} />}
      {state.status === "error" && <ErrorState message={errorText(state.error, t)} onRetry={reload} />}
      {state.status === "success" && (
        <div className="grid gap-4 sm:grid-cols-2">
          {state.data.map((d) => (
            <Card key={d.id}>
              <h3 className="font-semibold">{doctorName(d, locale)}</h3>
              <p className="text-sm text-slate-600">
                {doctorSpecialty(d, locale)} · {doctorBranch(d, locale)}
              </p>
              <p className="mt-3 text-sm font-medium text-brand-700">
                {t("common.fee")}: {money(d.fee)} {t("common.currency")}
              </p>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}

export function LandingPage() {
  const { t } = useT();

  function reset() {
    resetMockData();
    window.location.reload();
  }

  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <HowItWorks />
        <Doctors />
        {USE_MOCK && (
          <div className="pb-10 text-center">
            <Button variant="secondary" onClick={reset}>
              {t("landing.reset")}
            </Button>
          </div>
        )}
      </main>
    </>
  );
}
