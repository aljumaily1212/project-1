"use client";

import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { motion, type Variants } from "motion/react";
import { CalendarCheck, FileHeart, FlaskConical, Ticket } from "lucide-react";
import type { Doctor, ScreenDoctor } from "@/lib/api";
import { doctorName, doctorSpecialty, money } from "@/lib/display";
import { useT } from "@/lib/i18n";

// Slides for the waiting room TV: one about the complex, one about the doctors.
// The pictures are drawn here as simple flat illustrations (SVG), not photos, so they stay sharp on any TV.

// Children appear one after the other, each rising up out of a soft blur.
const list: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.25 } },
};
const rise: Variants = {
  hidden: { opacity: 0, y: 36, filter: "blur(6px)" },
  show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { type: "spring", stiffness: 110, damping: 18 } },
};
const pop: Variants = {
  hidden: { opacity: 0, scale: 0.6 },
  show: { opacity: 1, scale: 1, transition: { type: "spring", stiffness: 160, damping: 14 } },
};

// A number that counts up from 0 when the slide appears. It runs on a plain timer, not on animation
// frames, so it always reaches the real number, even if the browser pauses animations.
function CountUp({ to }: { to: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const start = Date.now() + 500;
    const duration = 1600;
    const show = (v: number) => {
      el.textContent = Math.round(v).toLocaleString("en-US");
    };
    show(0);
    const timer = setInterval(() => {
      const progress = Math.min(1, Math.max(0, (Date.now() - start) / duration));
      // Ease out: fast at first, slowing down at the end.
      show(to * (1 - (1 - progress) ** 3));
      if (progress === 1) clearInterval(timer);
    }, 40);
    return () => clearInterval(timer);
  }, [to]);
  return (
    <span ref={ref} dir="ltr" className="tabular-nums">
      0
    </span>
  );
}

// Something that bobs up and down slowly, forever.
const float = (delay: number, distance = 10) => ({
  animate: { y: [0, -distance, 0] },
  transition: { duration: 4, repeat: Infinity, ease: "easeInOut" as const, delay },
});

// The clinic building with a heartbeat card, a ticket and a pill floating around it.
function ClinicIllustration() {
  return (
    <svg viewBox="0 0 400 340" className="h-auto w-full max-w-xl 2xl:max-w-2xl" aria-hidden>
      <motion.circle
        cx="200"
        cy="180"
        r="150"
        fill="#14b8a6"
        fillOpacity="0.14"
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        style={{ transformOrigin: "200px 180px" }}
      />
      <ellipse cx="200" cy="292" rx="150" ry="14" fill="#000" fillOpacity="0.25" />

      {/* Trees */}
      <circle cx="82" cy="242" r="26" fill="#2dd4bf" />
      <circle cx="66" cy="258" r="18" fill="#14b8a6" />
      <rect x="78" y="258" width="7" height="32" rx="3" fill="#0f766e" />
      <circle cx="322" cy="248" r="22" fill="#2dd4bf" />
      <rect x="318" y="262" width="7" height="28" rx="3" fill="#0f766e" />

      {/* The building */}
      <rect x="110" y="120" width="180" height="170" rx="16" fill="#f8fafc" />
      <path d="M110 136 a16 16 0 0 1 16 -16 h148 a16 16 0 0 1 16 16 v20 h-180 z" fill="#14b8a6" />
      {[0, 1, 2].map((col) =>
        [0, 1].map((row) => (
          <rect key={`${col}-${row}`} x={130 + col * 52} y={170 + row * 42} width="36" height="26" rx="5" fill="#bae6fd" fillOpacity="0.8" />
        )),
      )}
      <rect x="180" y="236" width="40" height="54" rx="6" fill="#0f766e" />
      <circle cx="211" cy="264" r="2.5" fill="#99f6e4" />

      {/* The sign with the cross */}
      <circle cx="200" cy="104" r="30" fill="#fff" stroke="#14b8a6" strokeWidth="4" />
      <rect x="193" y="88" width="14" height="32" rx="3" fill="#14b8a6" />
      <rect x="184" y="97" width="32" height="14" rx="3" fill="#14b8a6" />

      {/* Heartbeat card */}
      <motion.g {...float(0)}>
        <rect x="18" y="58" width="118" height="62" rx="14" fill="#fff" />
        <motion.path
          d="M30 92 h22 l8 -18 l12 34 l10 -26 l6 10 h36"
          fill="none"
          stroke="#ef4444"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: [0, 1, 1] }}
          transition={{ duration: 2.4, repeat: Infinity, times: [0, 0.6, 1] }}
        />
      </motion.g>

      {/* Ticket card */}
      <motion.g {...float(1.2)}>
        <rect x="292" y="40" width="96" height="66" rx="14" fill="#fff" />
        <rect x="304" y="52" width="40" height="8" rx="4" fill="#99f6e4" />
        <text x="340" y="94" textAnchor="middle" fontSize="26" fontWeight="700" fontFamily="monospace" fill="#0f766e">
          A-07
        </text>
      </motion.g>

      {/* A pill */}
      <motion.g {...float(2.1, 14)}>
        <g transform="rotate(-30 52 176)">
          <rect x="22" y="164" width="60" height="24" rx="12" fill="#fff" />
          <path d="M52 164 h18 a12 12 0 0 1 0 24 h-18 z" fill="#f59e0b" />
        </g>
      </motion.g>

      {/* Little sparkles */}
      {[
        [350, 160, 0],
        [40, 300, 0.8],
        [270, 26, 1.6],
      ].map(([x, y, d]) => (
        <motion.path
          key={`${x}-${y}`}
          d={`M${x} ${y - 8} v16 M${x - 8} ${y} h16`}
          stroke="#5eead4"
          strokeWidth="3"
          strokeLinecap="round"
          animate={{ opacity: [0.2, 1, 0.2], scale: [0.8, 1.2, 0.8] }}
          transition={{ duration: 2.4, repeat: Infinity, delay: d }}
          style={{ transformOrigin: `${x}px ${y}px` }}
        />
      ))}
    </svg>
  );
}

const SKIN = ["#f1c27d", "#e0ac69", "#c68642", "#ffdbac"];
const HAIR = ["#2d1b12", "#4a3123", "#1f1f1f", "#6b4226"];
const ACCENT = ["#14b8a6", "#0ea5e9", "#8b5cf6", "#f59e0b"];

// A friendly drawn doctor. The colors and hair change with the doctor, so cards don't all look the same.
export function DoctorAvatar({ seed, className = "size-28 2xl:size-36" }: { seed: number; className?: string }) {
  const clip = useId();
  const skin = SKIN[seed % SKIN.length];
  const hair = HAIR[(seed + 1) % HAIR.length];
  const accent = ACCENT[seed % ACCENT.length];
  const style = seed % 3;
  return (
    <svg viewBox="0 0 120 120" className={className} aria-hidden>
      <defs>
        <clipPath id={clip}>
          <circle cx="60" cy="60" r="60" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clip})`}>
        <rect width="120" height="120" fill={accent} fillOpacity="0.25" />
        <circle cx="60" cy="60" r="44" fill={accent} fillOpacity="0.2" />
        {/* White coat, shirt, collar */}
        <path d="M14 124 C14 90 36 78 60 78 C84 78 106 90 106 124 Z" fill="#f8fafc" />
        <path d="M50 79 L60 100 L70 79 Z" fill={accent} />
        <path d="M50 79 L56 124 M70 79 L64 124" stroke="#cbd5e1" strokeWidth="2" />
        <rect x="53" y="62" width="14" height="18" rx="6" fill={skin} />
        {/* Stethoscope */}
        <path d="M46 82 C40 98 46 108 56 108" stroke="#334155" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        <circle cx="58" cy="108" r="3.5" fill="#334155" />
        {/* Head and face */}
        <circle cx="60" cy="46" r="20" fill={skin} />
        <circle cx="53" cy="47" r="2" fill="#1e293b" />
        <circle cx="67" cy="47" r="2" fill="#1e293b" />
        <path d="M54 55 Q60 60 66 55" stroke="#1e293b" strokeWidth="2" fill="none" strokeLinecap="round" />
        {style === 0 && <path d="M40 44 C40 28 50 23 60 23 C72 23 80 30 80 44 C76 36 68 32 60 32 C52 32 44 36 40 44 Z" fill={hair} />}
        {style === 1 && <path d="M39 48 C37 28 50 22 62 23 C74 24 82 32 80 46 C74 38 62 31 48 34 C44 38 41 42 39 48 Z" fill={hair} />}
        {style === 2 && (
          <>
            <path d="M40 42 C42 28 52 24 60 24 C68 24 78 28 80 42 Z" fill={accent} />
            <rect x="38" y="38" width="44" height="6" rx="3" fill={accent} />
          </>
        )}
      </g>
    </svg>
  );
}

const FEATURES = [
  { icon: CalendarCheck, key: "book" },
  { icon: Ticket, key: "ticket" },
  { icon: FileHeart, key: "file" },
  { icon: FlaskConical, key: "lab" },
] as const;

// About the complex: what it offers, a few live numbers, and the illustration.
export function AboutSlide({ doctors, today }: { doctors: Doctor[]; today: ScreenDoctor[] }) {
  const { t } = useT();
  const working = today.filter((d) => !d.absent).length;
  const stats = [
    { value: doctors.length, label: t("slides.statDoctors") },
    { value: working, label: t("slides.statToday") },
    { value: 2, label: t("slides.statBranches") },
  ];
  return (
    <div className="grid items-center gap-10 lg:grid-cols-[1.15fr_1fr]">
      <motion.div variants={list} initial="hidden" animate="show" className="space-y-6">
        <motion.span variants={rise} className="inline-block rounded-full bg-[#5eead4]/15 px-4 py-1.5 font-semibold text-[#5eead4] 2xl:text-xl">
          {t("slides.aboutBadge")}
        </motion.span>
        <motion.h2 variants={rise} className="text-3xl leading-tight font-bold lg:text-5xl 2xl:text-6xl">
          {t("slides.aboutTitle")}
        </motion.h2>
        <motion.p variants={rise} className="max-w-2xl text-lg opacity-80 lg:text-xl 2xl:max-w-4xl 2xl:text-2xl 2xl:leading-snug">
          {t("slides.aboutText")}
        </motion.p>
        <div className="grid gap-4 sm:grid-cols-2">
          {FEATURES.map(({ icon: Icon, key }) => (
            <motion.div key={key} variants={rise} className="flex gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm 2xl:gap-5 2xl:p-6">
              <motion.span variants={pop} className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#5eead4]/15 text-[#5eead4] 2xl:size-16 2xl:rounded-2xl">
                <Icon className="size-5 2xl:size-8" aria-hidden />
              </motion.span>
              <span>
                <span className="block text-lg font-semibold 2xl:text-2xl">{t(`slides.feature.${key}`)}</span>
                <span className="block text-sm opacity-75 2xl:mt-1 2xl:text-lg">{t(`slides.feature.${key}Text`)}</span>
              </span>
            </motion.div>
          ))}
        </div>
      </motion.div>

      <div className="relative flex flex-col items-center gap-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.85, rotate: -3 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 70, damping: 14, delay: 0.3 }}
          className="w-full"
        >
          <ClinicIllustration />
        </motion.div>
        <motion.div variants={list} initial="hidden" animate="show" className="grid w-full grid-cols-3 gap-3">
          {stats.map((s) => (
            <motion.div key={s.label} variants={pop} className="rounded-2xl bg-white/10 px-3 py-4 text-center backdrop-blur-sm">
              <p className="text-3xl font-bold text-[#5eead4] lg:text-4xl 2xl:text-6xl">
                <CountUp to={s.value} />
              </p>
              <p className="mt-1 opacity-80 2xl:text-xl">{s.label}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}

// Used before the screen size is known (the first draw).
export const DOCTORS_PER_PAGE = 6;
// How long each page of doctors stays before the next page.
export const DOCTOR_PAGE_MS = 9000;

// How many doctor cards fit on this screen without scrolling: columns from the width, rows from the height.
// With more doctors than that, the slide turns pages. `reserve` is height other things take on the page,
// like the queue strip at the bottom of the waiting screen.
function perPageFor(width: number, height: number, reserve: number) {
  const cols = width >= 1024 ? 3 : width >= 768 ? 2 : 1;
  const big = width >= 1536;
  // Header, progress bar, the slide's title, the page dots and the footer.
  const fixed = big ? 560 : 470;
  // One row of cards, with the gap under it.
  const row = big ? 200 : 135;
  const rows = Math.max(1, Math.floor((height - fixed - reserve) / row));
  return cols * rows;
}

const subscribeResize = (onChange: () => void) => {
  window.addEventListener("resize", onChange);
  return () => window.removeEventListener("resize", onChange);
};

export function useDoctorsPerPage(reserve = 0) {
  return useSyncExternalStore(subscribeResize, () => perPageFor(window.innerWidth, window.innerHeight, reserve), () => DOCTORS_PER_PAGE);
}

// The screen's width, kept up to date when the window changes size.
export function useScreenWidth() {
  return useSyncExternalStore(subscribeResize, () => window.innerWidth, () => 1280);
}

// How the waiting screen arranges n doctors so they all fit on one screen, as large as possible:
// 4 doctors → 2×2, 6 → 3×2, 8 → 4×2, 12 → 4×3, 15 → 5×3.
export function queueGrid(n: number) {
  const cols = n <= 3 ? Math.max(1, n) : n === 4 ? 2 : n <= 6 ? 3 : n <= 8 ? 4 : n === 9 ? 3 : n <= 12 ? 4 : n <= 15 ? 5 : 6;
  return { cols, rows: Math.ceil(n / cols) };
}

// How long the doctors slide stays: long enough for every page of doctors.
export function doctorsSlideMs(count: number, perPage: number, minimum: number) {
  return Math.max(minimum, Math.ceil(Math.max(1, count) / perPage) * DOCTOR_PAGE_MS);
}

// The doctors: a drawn picture, name, specialty, the visit fee, and whether they work today.
// When they don't all fit on the screen (perPage, from useDoctorsPerPage), the slide turns its own pages.
export function DoctorsSlide({ doctors, today, branchFirst, perPage }: { doctors: Doctor[]; today: ScreenDoctor[]; branchFirst?: string; perPage: number }) {
  const { t, locale } = useT();
  const [page, setPage] = useState(0);
  const todayOf = (id: number) => today.find((d) => d.doctor.id === id);
  // Doctors working today come first, and those in this TV's branch before the others.
  const rank = (d: Doctor) => {
    const s = todayOf(d.id);
    if (!s || s.absent) return 2;
    return branchFirst && branchFirst !== "all" && s.branch !== branchFirst ? 1 : 0;
  };
  const sorted = [...doctors].sort((a, b) => rank(a) - rank(b) || a.id - b.id);
  const pages = Math.max(1, Math.ceil(sorted.length / perPage));
  const shown = sorted.slice((page % pages) * perPage, (page % pages + 1) * perPage);

  useEffect(() => {
    if (pages < 2) return;
    const timer = setInterval(() => setPage((p) => p + 1), DOCTOR_PAGE_MS);
    return () => clearInterval(timer);
  }, [pages]);

  return (
    <div className="space-y-6">
      <motion.div variants={list} initial="hidden" animate="show" className="space-y-2 text-center">
        <motion.span variants={rise} className="inline-block rounded-full bg-[#5eead4]/15 px-4 py-1.5 text-lg font-semibold text-[#5eead4] 2xl:text-2xl">
          {t("slides.doctorsBadge")}
        </motion.span>
        <motion.h2 variants={rise} className="text-4xl font-bold lg:text-5xl 2xl:text-7xl">
          {t("slides.doctorsTitle")}
        </motion.h2>
        <motion.p variants={rise} className="mx-auto max-w-3xl text-xl opacity-80 2xl:text-3xl">
          {t("slides.doctorsText")}
        </motion.p>
      </motion.div>

      <motion.div key={page % pages} variants={list} initial="hidden" animate="show" className="flex flex-wrap justify-center gap-4 2xl:gap-6">
        {shown.map((d) => {
          const s = todayOf(d.id);
          const status = !s ? "off" : s.absent ? "absent" : "working";
          return (
            <motion.article
              key={d.id}
              variants={rise}
              data-slide-doctor={d.id}
              className="flex w-full items-center gap-4 rounded-3xl border md:w-[calc(50%-0.5rem)] lg:w-[calc(33.333%-0.667rem)] 2xl:w-[calc(33.333%-1rem)] border-white/10 bg-white/5 p-4 backdrop-blur-sm 2xl:gap-6 2xl:p-6"
            >
              <motion.div variants={pop} className="shrink-0">
                <DoctorAvatar seed={d.id} className="size-16 2xl:size-32" />
              </motion.div>
              <div className="min-w-0 space-y-1">
                <h3 className="truncate text-xl font-bold 2xl:text-3xl">{doctorName(d, locale)}</h3>
                <p className="text-base text-[#5eead4] 2xl:text-2xl">{doctorSpecialty(d, locale)}</p>
                <p className="text-sm opacity-75 2xl:text-xl">{t("slides.fee", { amount: money(d.fee) })}</p>
                <p
                  className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold whitespace-nowrap 2xl:px-4 2xl:py-1.5 2xl:text-lg ${
                    status === "working" ? "bg-[#22c55e]/15 text-[#86efac]" : status === "absent" ? "bg-[#ef4444]/15 text-[#fecaca]" : "bg-white/10 opacity-80"
                  }`}
                >
                  <span className={`size-2 rounded-full ${status === "working" ? "animate-pulse bg-[#4ade80]" : status === "absent" ? "bg-[#f87171]" : "bg-white/50"}`} />
                  {status === "working" ? t("slides.workingIn", { branch: t(`branch.${s!.branch}`) }) : status === "absent" ? t("screen.absent") : t("slides.notToday")}
                </p>
              </div>
            </motion.article>
          );
        })}
      </motion.div>

      {pages > 1 && (
        <div className="flex justify-center gap-2" aria-hidden>
          {Array.from({ length: pages }, (_, i) => (
            <span key={i} className={`h-2 rounded-full transition-all ${i === page % pages ? "w-8 bg-[#5eead4]" : "w-2 bg-white/30"}`} />
          ))}
        </div>
      )}
    </div>
  );
}

// While an info slide is showing, this bar keeps every doctor's "now in the clinic" on screen,
// in the same style as the queue cards, so people waiting never lose their number.
export function QueueStrip({ doctors, freshOf }: { doctors: ScreenDoctor[]; freshOf: (d: ScreenDoctor) => boolean }) {
  const { t, locale } = useT();
  // One row only (the slides above keep room for one). Each doctor needs about 300 px; with more doctors
  // than fit, the strip shows them a row at a time.
  const width = useScreenWidth();
  const perRow = Math.max(1, Math.floor((width - 64) / 300));
  const rows = Math.max(1, Math.ceil(doctors.length / perRow));
  const [row, setRow] = useState(0);
  useEffect(() => {
    if (rows < 2) return;
    const timer = setInterval(() => setRow((r) => r + 1), 6000);
    return () => clearInterval(timer);
  }, [rows]);
  const shown = doctors.slice((row % rows) * perRow, (row % rows + 1) * perRow);
  return (
    <motion.div
      initial={{ y: 140, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 140, opacity: 0 }}
      transition={{ type: "spring", stiffness: 120, damping: 18 }}
      data-queue-strip
      className="fixed inset-x-0 bottom-0 z-20 border-t border-white/10 bg-[#041513]/90 px-6 py-3 backdrop-blur-md lg:px-10"
    >
      <div className="flex justify-center gap-3">
        {shown.map((d) => {
          const fresh = freshOf(d);
          return (
            <div
              key={d.doctor.id}
              data-strip-doctor={d.doctor.id}
              className={`flex min-w-64 flex-1 basis-64 items-center justify-between gap-4 rounded-2xl border px-4 py-2 transition-colors lg:max-w-md 2xl:max-w-xl 2xl:px-6 2xl:py-3 ${
                fresh ? "border-[#5eead4] bg-[#5eead4]/10 shadow-[0_0_30px_rgb(94_234_212/0.3)]" : "border-white/10 bg-white/5"
              }`}
            >
              <div className="min-w-0">
                <p className="truncate text-lg font-bold 2xl:text-2xl">{doctorName(d.doctor, locale)}</p>
                <p className="truncate text-sm opacity-70 2xl:text-base">{doctorSpecialty(d.doctor, locale)}</p>
                {!d.absent && (
                  <p className="text-sm opacity-70 2xl:text-base">
                    {d.next.length > 0 ? (
                      <>
                        {t("screen.next")}:{" "}
                        <span dir="ltr" className="font-mono font-semibold">
                          {d.next[0]}
                        </span>
                        {" · "}
                      </>
                    ) : null}
                    {t("screen.waiting", { n: d.waiting })}
                  </p>
                )}
              </div>
              {d.absent ? (
                <span className="shrink-0 rounded-xl bg-[#ef4444]/20 px-3 py-2 text-sm font-semibold text-[#fecaca]">{t("screen.absent")}</span>
              ) : (
                <div className="shrink-0 text-center">
                  <p className="text-xs opacity-70 2xl:text-sm">{t("screen.now")}</p>
                  <p dir="ltr" data-strip-now className={`font-mono text-4xl font-bold 2xl:text-6xl ${fresh ? "animate-pulse text-[#5eead4]" : ""}`}>
                    {d.now ?? "—"}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

// A thin bar that fills up until the next slide.
export function SlideProgress({ startedAt, ms }: { startedAt: number; ms: number }) {
  return (
    <div className="h-1 w-full overflow-hidden rounded-full bg-white/10" aria-hidden>
      <motion.div
        key={startedAt}
        className="h-full bg-[#5eead4]"
        initial={{ width: "0%" }}
        animate={{ width: "100%" }}
        transition={{ duration: ms / 1000, ease: "linear" }}
      />
    </div>
  );
}

// The time, ticking every second, in the screen's language.
export function Clock() {
  const { locale } = useT();
  const [time, setTime] = useState<Date | null>(null);
  useEffect(() => {
    const tick = () => setTime(new Date());
    const first = setTimeout(tick, 0);
    const timer = setInterval(tick, 1000);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, []);
  if (!time) return null;
  const format = (options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat(locale === "ar" ? "ar-IQ-u-nu-latn" : "en-GB", options).format(time);
  return (
    <div className="text-end">
      <p className="text-4xl font-bold tabular-nums" dir="ltr">
        {format({ hour: "2-digit", minute: "2-digit", hour12: false })}
      </p>
      <p className="text-sm opacity-70">{format({ weekday: "long", day: "numeric", month: "long" })}</p>
    </div>
  );
}

// How a whole slide comes in and leaves: it slides in the reading direction and fades through a blur.
export function slideMotion(rtl: boolean) {
  const shift = rtl ? -90 : 90;
  return {
    initial: { opacity: 0, x: shift, filter: "blur(10px)" },
    animate: { opacity: 1, x: 0, filter: "blur(0px)" },
    exit: { opacity: 0, x: -shift, filter: "blur(10px)" },
    transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] as const },
  };
}
