"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Maximize, Volume2, VolumeX } from "lucide-react";
import { api, type BranchId, type ScreenDoctor } from "@/lib/api";
import { doctorName, doctorSpecialty } from "@/lib/display";
import { errorText, useT } from "@/lib/i18n";
import { useLoad } from "@/lib/useLoad";
import { LanguageSwitch } from "@/components/language-switch";
import { LogoMark } from "@/components/logo";

type BranchFilter = "all" | BranchId;
const BRANCHES: BranchFilter[] = ["all", "main", "second"];
const BRANCH_KEY = "alrahma.screen.branch";
const BRANCH_EVENT = "alrahma-screen-branch";
// A ticket called in the last 20 seconds glows, so people notice it changed.
const FRESH_MS = 20_000;

// A short two-note chime made by the browser itself, so there is no sound file to load.
function chime() {
  const audio = new AudioContext();
  [880, 660].forEach((frequency, i) => {
    const tone = audio.createOscillator();
    const volume = audio.createGain();
    tone.frequency.value = frequency;
    const start = audio.currentTime + i * 0.35;
    volume.gain.setValueAtTime(0.25, start);
    volume.gain.exponentialRampToValueAtTime(0.001, start + 0.6);
    tone.connect(volume).connect(audio.destination);
    tone.start(start);
    tone.stop(start + 0.6);
  });
}

// Each TV remembers which branch it shows, the same way the theme and language are remembered.
function subscribeBranch(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(BRANCH_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(BRANCH_EVENT, onChange);
  };
}

function readBranch(): BranchFilter {
  try {
    const saved = localStorage.getItem(BRANCH_KEY) as BranchFilter | null;
    return saved && BRANCHES.includes(saved) ? saved : "all";
  } catch {
    return "all";
  }
}

function saveBranch(branch: BranchFilter) {
  try {
    localStorage.setItem(BRANCH_KEY, branch);
  } catch {}
  window.dispatchEvent(new Event(BRANCH_EVENT));
}

// The time, ticking every second, in the screen's language.
function Clock() {
  const { locale } = useT();
  const [time, setTime] = useState<Date | null>(null);
  useEffect(() => {
    const tick = () => setTime(new Date());
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
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

function DoctorPanel({ item, fresh }: { item: ScreenDoctor; fresh: boolean }) {
  const { t, locale } = useT();
  return (
    <section
      data-screen-doctor={item.doctor.id}
      className={`flex flex-col gap-4 rounded-3xl border bg-white/5 p-6 backdrop-blur-sm transition-colors ${
        fresh ? "border-[#5eead4] shadow-[0_0_40px_rgb(94_234_212/0.35)]" : "border-white/10"
      }`}
    >
      <div>
        <h2 className="text-2xl font-bold">{doctorName(item.doctor, locale)}</h2>
        <p className="opacity-70">
          {doctorSpecialty(item.doctor, locale)} · {t(`branch.${item.branch}`)}
        </p>
      </div>

      {item.absent ? (
        <p className="rounded-2xl bg-red-500/20 px-4 py-6 text-center text-2xl font-semibold text-red-100">{t("screen.absent")}</p>
      ) : (
        <>
          <div className="rounded-2xl bg-black/20 px-4 py-5 text-center">
            <p className="text-sm uppercase tracking-wide opacity-70">{t("screen.now")}</p>
            <p dir="ltr" data-screen-now className={`font-mono text-7xl font-bold tracking-tight lg:text-8xl ${fresh ? "animate-pulse text-[#5eead4]" : ""}`}>
              {item.now ?? "—"}
            </p>
          </div>
          <div>
            <p className="mb-2 text-sm opacity-70">{t("screen.next")}</p>
            {item.next.length === 0 ? (
              <p className="opacity-60">{t("screen.nobody")}</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {item.next.map((ticket) => (
                  <span key={ticket} dir="ltr" className="rounded-xl bg-white/10 px-3 py-1.5 font-mono text-2xl font-semibold">
                    {ticket}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="mt-auto flex flex-wrap justify-between gap-2 text-sm opacity-80">
            <span>{t("screen.waiting", { n: item.waiting })}</span>
            {item.late_minutes > 0 && <span className="text-amber-200">{t("screen.late", { n: item.late_minutes })}</span>}
          </div>
        </>
      )}
    </section>
  );
}

// The waiting room TV. No sign-in: it only shows ticket numbers, never names.
export default function QueueScreenPage() {
  const { t, locale } = useT();
  const { state, reload } = useLoad(api.queueScreen, "", { every: 3000 });
  const branch = useSyncExternalStore(subscribeBranch, readBranch, () => "all" as const);
  const [sound, setSound] = useState(false);
  // The current time, updated every second, so a new ticket's glow goes away by itself.
  const [nowMs, setNowMs] = useState(0);
  const lastCalls = useRef<Map<number, string | null> | null>(null);
  const Back = locale === "ar" ? ArrowRight : ArrowLeft;

  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Chime when any doctor calls a new ticket. Not on the first load, only on changes.
  const data = state.status === "success" ? state.data : null;
  useEffect(() => {
    if (!data) return;
    const calls = new Map(data.map((d) => [d.doctor.id, d.called_at]));
    const before = lastCalls.current;
    lastCalls.current = calls;
    if (!before || !sound) return;
    if ([...calls].some(([id, at]) => at && at !== before.get(id))) chime();
  }, [data, sound]);

  const doctors = data?.filter((d) => branch === "all" || d.branch === branch) ?? [];
  const freshOf = (d: ScreenDoctor) => !!d.called_at && nowMs - Date.parse(d.called_at) < FRESH_MS;

  return (
    <div className="login-panel min-h-screen p-6 text-[#f8fafc] lg:p-10">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <LogoMark size={56} />
          <div>
            <h1 className="text-3xl font-bold">{t("login.panel.tagline")}</h1>
            <p className="opacity-75">{t("screen.title")}</p>
          </div>
        </div>
        <Clock />
      </header>

      {state.status === "loading" && <p className="py-20 text-center text-xl opacity-70">{t("screen.loading")}</p>}
      {state.status === "error" && (
        <button type="button" onClick={reload} className="mx-auto block py-20 text-xl underline">
          {errorText(state.error, t)}
        </button>
      )}
      {state.status === "success" && doctors.length === 0 && <p className="py-20 text-center text-2xl opacity-80">{t("screen.noDoctors")}</p>}
      {doctors.length > 0 && (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {doctors.map((d) => (
            <DoctorPanel key={d.doctor.id} item={d} fresh={freshOf(d)} />
          ))}
        </div>
      )}

      {/* Small controls for whoever sets the TV up. They fade until pointed at. */}
      <footer className="mt-10 flex flex-wrap items-center justify-between gap-3 text-sm opacity-40 transition-opacity hover:opacity-100 focus-within:opacity-100">
        <Link href="/" className="inline-flex items-center gap-1.5 underline">
          <Back className="size-4" aria-hidden />
          {t("screen.back")}
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          {BRANCHES.map((b) => (
            <button
              key={b}
              type="button"
              onClick={() => saveBranch(b)}
              className={`rounded-lg px-3 py-1.5 ${b === branch ? "bg-white/20 font-semibold" : "hover:bg-white/10"}`}
            >
              {b === "all" ? t("screen.allBranches") : t(`branch.${b}`)}
            </button>
          ))}
          <button type="button" onClick={() => setSound(!sound)} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 hover:bg-white/10">
            {sound ? <Volume2 className="size-4" aria-hidden /> : <VolumeX className="size-4" aria-hidden />}
            {sound ? t("screen.soundOn") : t("screen.soundOff")}
          </button>
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
  );
}
