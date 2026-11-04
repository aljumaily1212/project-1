"use client";

import { ALargeSmall } from "lucide-react";
import { useT } from "@/lib/i18n";
import { setTextSize, TEXT_SIZES, useTextSize } from "@/lib/text-size";

// One button that steps through the three sizes: normal → large → larger → normal.
// The three small bars under the icon show which size is on.
export function TextSizeToggle({ className = "" }: { className?: string }) {
  const { t } = useT();
  const size = useTextSize();
  const index = TEXT_SIZES.indexOf(size);
  const next = TEXT_SIZES[(index + 1) % TEXT_SIZES.length];
  const label = t("textSize.label", { now: t(`textSize.${size}`), next: t(`textSize.${next}`) });

  return (
    <button
      type="button"
      onClick={() => setTextSize(next)}
      aria-label={label}
      title={label}
      data-text-size={size}
      className={`relative inline-flex h-8 w-8 shrink-0 flex-col items-center justify-center gap-0.5 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 ${className}`}
    >
      <ALargeSmall className="h-4 w-4" aria-hidden />
      <span className="flex gap-0.5" aria-hidden>
        {TEXT_SIZES.map((s, i) => (
          <span key={s} className={`h-0.5 w-1.5 rounded-full ${i <= index ? "bg-brand-600" : "bg-slate-300"}`} />
        ))}
      </span>
    </button>
  );
}
