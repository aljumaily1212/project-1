"use client";

import { useEffect, useState } from "react";
import { CircleCheck, TriangleAlert, Users } from "lucide-react";
import { api, type DuplicateCandidate, type DuplicateCheck } from "@/lib/api";
import { useT } from "@/lib/i18n";
import { Button } from "@/components/common";

type Found = DuplicateCandidate["patient"];

// While reception types a new patient's name and phone, ask the server whether this person is already
// registered, so the same person doesn't end up with two files.
// - Same name and phone: a clear warning, with a button to use the existing patient instead.
// - Same phone, different name: only a soft note (a family often shares one phone). Nothing is blocked.
// mode "walkIn": choosing fills the form with the existing patient's exact name, so the visit goes on their file.
// mode "pick": choosing switches to that patient (phone booking).
export function DuplicateWarning({ name, phone, mode, onUse }: { name: string; phone: string; mode: "walkIn" | "pick"; onUse: (p: Found) => void }) {
  const { t } = useT();
  const typed = name.trim();
  const ready = typed.length >= 3 && /^07\d{9}$/.test(phone);
  const key = `${typed}|${phone}`;
  const [result, setResult] = useState<{ key: string; data: DuplicateCheck } | null>(null);

  useEffect(() => {
    if (!ready || !navigator.onLine) return;
    let stale = false;
    // Wait until typing stops for half a second, so every letter doesn't send a request.
    const timer = setTimeout(() => {
      api
        .checkDuplicates({ name: typed, phone })
        .then((data) => !stale && setResult({ key, data }))
        // Only a helper: if the check fails, reception can still carry on.
        .catch(() => undefined);
    }, 500);
    return () => {
      stale = true;
      clearTimeout(timer);
    };
  }, [ready, typed, phone, key]);

  // An old answer (for what was typed before) is never shown.
  if (!ready || !result || result.key !== key || result.data.candidates.length === 0) return null;
  const exact = result.data.candidates.filter((c) => c.match_type === "exact_match");
  const family = result.data.candidates.filter((c) => c.match_type === "shared_phone_family");
  const other = result.data.candidates.filter((c) => c.match_type !== "exact_match" && c.match_type !== "shared_phone_family");
  // Walk-in: the form already holds that patient's exact name and phone, so the server will use their file.
  const using = mode === "walkIn" && exact.find((c) => c.patient.name === typed && c.patient.phone === phone);

  const row = (c: DuplicateCandidate, strong: boolean) => (
    <li key={c.patient.id} className="flex flex-wrap items-center justify-between gap-2" data-duplicate={c.patient.id}>
      <span>
        <span className="font-medium">{c.patient.name}</span> · <span dir="ltr">{c.patient.phone}</span>
        <span className="block text-xs opacity-80">{t("dup.counts", { v: c.patient.visits, a: c.patient.appointments })}</span>
      </span>
      <Button type="button" variant={strong ? "primary" : "secondary"} onClick={() => onUse(c.patient)}>
        {t("dup.use")}
      </Button>
    </li>
  );

  return (
    <div className="space-y-2" data-duplicate-warning>
      {using ? (
        <p className="flex items-start gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          <CircleCheck className="mt-0.5 size-4 shrink-0" aria-hidden />
          {t("dup.using")}
        </p>
      ) : (
        exact.length > 0 && (
          <div role="alert" className="space-y-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            <p className="flex items-start gap-2 font-medium">
              <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
              {t("dup.exact")}
            </p>
            <ul className="space-y-2">{exact.map((c) => row(c, true))}</ul>
          </div>
        )
      )}
      {other.length > 0 && !using && (
        <div className="space-y-2 rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-700">
          <p>{t("dup.possible")}</p>
          <ul className="space-y-2">{other.map((c) => row(c, false))}</ul>
        </div>
      )}
      {family.length > 0 && (
        <p className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-3 py-1 text-xs font-medium text-sky-800">
          <Users className="size-3.5" aria-hidden />
          {t("dup.family")}: {family.map((c) => c.patient.name).join("، ")}
        </p>
      )}
    </div>
  );
}
