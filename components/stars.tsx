"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { useT } from "@/lib/i18n";

// Shows a rating as 5 stars, the first `value` filled. Read-only.
// They follow the page direction: in Arabic the stars fill from the right, as Arabic readers expect.
export function Stars({ value, size = "size-4" }: { value: number; size?: string }) {
  const { t } = useT();
  return (
    <span className="inline-flex items-center gap-0.5" role="img" aria-label={t("rating.outOf", { n: value })}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} className={`${size} ${n <= Math.round(value) ? "fill-amber-400 text-amber-400" : "text-slate-300"}`} aria-hidden />
      ))}
    </span>
  );
}

// Lets the patient pick 1 to 5 stars. Pointing at a star previews it; clicking chooses it.
// Each star is a radio button, so keyboards and screen readers can use it too.
export function StarPicker({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const { t } = useT();
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  return (
    <div role="radiogroup" aria-label={t("rating.pick")} className="inline-flex gap-1" onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={t("rating.outOf", { n })}
          data-star={n}
          onMouseEnter={() => setHover(n)}
          onClick={() => onChange(n)}
          className="rounded p-0.5 focus-visible:outline-2 focus-visible:outline-brand-500"
        >
          <Star className={`size-7 transition-colors ${n <= shown ? "fill-amber-400 text-amber-400" : "text-slate-300"}`} aria-hidden />
        </button>
      ))}
    </div>
  );
}
