"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { ArrowLeft, ArrowRight, Maximize } from "lucide-react";
import { api } from "@/lib/api";
import { useT } from "@/lib/i18n";
import { useLoad } from "@/lib/useLoad";
import { LanguageSwitch } from "@/components/language-switch";
import { LogoMark } from "@/components/logo";
import { AboutSlide, Clock, DOCTOR_PAGE_MS, DOCTORS_PER_PAGE, DoctorsSlide, SlideProgress, slideMotion } from "@/components/screen-slides";

type Slide = "about" | "doctors";
const SEQUENCE: Slide[] = ["about", "doctors"];
const ABOUT_MS = 15_000;

// Only the info slides (about the complex, then the doctors), without the queue.
// For a second screen, the entrance, or showing a visitor what the complex offers. No sign-in.
export default function InfoScreenPage() {
  const { t, locale } = useT();
  const doctorList = useLoad(api.listDoctors, "", { every: 60_000 });
  const today = useLoad(api.queueScreen, "", { every: 30_000 });
  const doctors = doctorList.state.status === "success" ? doctorList.state.data : [];
  const todayData = today.state.status === "success" ? today.state.data : [];
  const doctorsMs = Math.max(ABOUT_MS, Math.ceil(Math.max(1, doctors.length) / DOCTORS_PER_PAGE) * DOCTOR_PAGE_MS);
  const [at, setAt] = useState({ step: 0, since: 0 });
  const slide = SEQUENCE[at.step];
  const ms = slide === "about" ? ABOUT_MS : doctorsMs;
  const Back = locale === "ar" ? ArrowRight : ArrowLeft;

  // Start on the first slide right away, then show the next one each time a slide's time is up.
  useEffect(() => {
    const timer = setTimeout(
      () => setAt((cur) => (cur.since === 0 ? { step: 0, since: Date.now() } : { step: (cur.step + 1) % SEQUENCE.length, since: Date.now() })),
      at.since === 0 ? 0 : ms,
    );
    return () => clearTimeout(timer);
  }, [at, ms]);

  return (
    <MotionConfig reducedMotion="user">
      <div className="login-panel min-h-screen overflow-x-hidden p-6 text-[#f8fafc] lg:p-10">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <LogoMark size={56} />
            <div>
              <h1 className="text-3xl font-bold">{t("login.panel.tagline")}</h1>
              <p className="opacity-75">{t("slides.infoTitle")}</p>
            </div>
          </div>
          <Clock />
        </header>
        {at.since > 0 && (
          <div className="mb-6">
            <SlideProgress startedAt={at.since} ms={ms} />
          </div>
        )}

        <AnimatePresence mode="wait">
          {at.since > 0 && (
            <motion.div key={`${at.step}-${slide}`} {...slideMotion(locale === "ar")} data-slide={slide} className="lg:flex lg:min-h-[calc(100vh-17rem)] lg:flex-col lg:justify-center">
              {slide === "about" ? <AboutSlide doctors={doctors} today={todayData} /> : <DoctorsSlide doctors={doctors} today={todayData} />}
            </motion.div>
          )}
        </AnimatePresence>

        <footer className="mt-10 flex flex-wrap items-center justify-between gap-3 text-sm opacity-40 transition-opacity hover:opacity-100 focus-within:opacity-100">
          <Link href="/" className="inline-flex items-center gap-1.5 underline">
            <Back className="size-4" aria-hidden />
            {t("screen.back")}
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            {SEQUENCE.map((s, i) => (
              <button
                key={s}
                type="button"
                onClick={() => setAt({ step: i, since: Date.now() })}
                className={`rounded-lg px-3 py-1.5 ${s === slide ? "bg-white/20 font-semibold" : "hover:bg-white/10"}`}
              >
                {t(`slides.name.${s}`)}
              </button>
            ))}
            <button
              type="button"
              onClick={() => void document.documentElement.requestFullscreen?.()}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 hover:bg-white/10"
            >
              <Maximize className="size-4" aria-hidden />
              {t("screen.fullscreen")}
            </button>
            <LanguageSwitch />
          </div>
        </footer>
      </div>
    </MotionConfig>
  );
}
