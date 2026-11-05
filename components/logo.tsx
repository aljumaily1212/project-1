"use client";

import { useId } from "react";
import { useTheme } from "@/lib/theme";

// The heart: two round tops and the two straight sides down to the point.
const HEART = "M60 99.24 L25.53 59.84 A22.35 22.35 0 1 1 60 31.4 A22.35 22.35 0 1 1 94.47 59.84 Z";

// A heartbeat line: flat, a small rise, a deep fall, a rise, then flat again (points on the 120 × 120 grid).
const HEARTBEAT = "31,58 45,58 51,46 59,70 65,51 70,58 89,58";

// The logo: a white heart (الرحمة: mercy and care) with a heartbeat line (medicine, life) cut through it,
// on the green tile. The tile and the line share one gradient laid over the whole drawing (userSpaceOnUse),
// so the line looks like a cut in the heart. app/icon.svg (the browser tab) is the same drawing: change both together.
export function LogoMark({ size = 32, className = "" }: { size?: number; className?: string }) {
  const id = useId();
  const fill = `url(#${id})`;
  return (
    <svg viewBox="0 0 120 120" width={size} height={size} className={className} aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="120" y2="120" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#14b8a6" />
          <stop offset="1" stopColor="#0f766e" />
        </linearGradient>
      </defs>
      <rect width="120" height="120" rx="28" fill={fill} />
      <path d={HEART} fill="#fff" stroke="#fff" strokeWidth="4" strokeLinejoin="round" />
      <polyline
        points={HEARTBEAT}
        fill="none"
        stroke={fill}
        strokeWidth="6.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
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
