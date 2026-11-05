"use client";

import { useId } from "react";
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

// The complex's name is the same in both languages: it's a name, not something to translate.
export const BRAND_NAME = "مجمع الرحمة الطبي";

export function Wordmark({ onDark, className = "" }: { onDark?: boolean; className?: string }) {
  const theme = useTheme();
  onDark ??= theme === "dark";
  const color = onDark ? "text-[#f8fafc]" : "text-[#0f172a]";
  // lang and dir keep the Arabic letters joined and in the right order inside an English page.
  return (
    <span lang="ar" dir="rtl" className={`font-extrabold tracking-tight ${color} ${className}`}>
      {BRAND_NAME}
    </span>
  );
}

export function Logo({ size = 32, onDark, className = "" }: { size?: number; onDark?: boolean; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`} aria-label={BRAND_NAME}>
      <LogoMark size={size} />
      <Wordmark onDark={onDark} />
    </span>
  );
}
