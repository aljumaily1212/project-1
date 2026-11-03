"use client";

import { useId } from "react";
import { useT } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";

export function LogoMark({ size = 32, className = "" }: { size?: number; className?: string }) {
  const id = useId();
  return (
    <svg viewBox="0 0 120 120" width={size} height={size} className={className} aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#14b8a6" />
          <stop offset="1" stopColor="#0f766e" />
        </linearGradient>
      </defs>
      <rect width="120" height="120" rx="28" fill={`url(#${id})`} />
      <path d="M50 28 H70 V50 H92 V70 H70 V92 H50 V70 H28 V50 H50 Z" fill="#fff" />
    </svg>
  );
}

export function Wordmark({ onDark, className = "" }: { onDark?: boolean; className?: string }) {
  const { t } = useT();
  const theme = useTheme();
  onDark ??= theme === "dark";
  const color = onDark ? "text-[#f8fafc]" : "text-[#0f172a]";
  return <span className={`font-extrabold tracking-tight ${color} ${className}`}>{t("app.name")}</span>;
}

export function Logo({ size = 32, onDark, className = "" }: { size?: number; onDark?: boolean; className?: string }) {
  const { t } = useT();
  return (
    <span className={`inline-flex items-center gap-2 ${className}`} aria-label={t("app.name")}>
      <LogoMark size={size} />
      <Wordmark onDark={onDark} />
    </span>
  );
}
