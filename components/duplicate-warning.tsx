"use client";

import { useEffect, useState } from "react";
import { CircleCheck, Phone, TriangleAlert, Users } from "lucide-react";
import { api, type DuplicateCandidate, type DuplicateCheck } from "@/lib/api";
import { useT } from "@/lib/i18n";
import { Button } from "@/components/common";

type Found = DuplicateCandidate["patient"];

// While reception types a new patient's phone (and name), ask the server whether this person is already
// registered, so the same person doesn't end up with two files.
// - Phone number complete, no name yet: who already has this number, so reception can pick them right away.
// - Same name and phone: a clear warning, with a button to use the existing patient instead.
// - Same phone, different name: only a soft note (a family often shares one phone). Nothing is blocked.
// mode "walkIn": choosing fills the form with the existing patient's exact name, so the visit goes on their file.
// mode "pick": choosing switches to that patient (phone booking).
export function DuplicateWarning({ name, phone, mode, onUse }: { name: string; phone: string; mode: "walkIn" | "pick"; onUse: (p: Found) => void }) {
  const { t } = useT();
  const typed = name.trim();
  const phoneOk = /^07\d{9}$/.test(phone);
  // The name is optional: the check starts as soon as the phone number is complete. Once a name is typed, it's
  // sent too, and the server can tell "the same person" from "someone else on the same phone".
  const named = typed.length >= 3;
  const askName = named ? typed : "";
  const key = `${askName}|${phone}`;
  const [result, setResult] = useState<{ phone: string; named: boolean; data: DuplicateCheck } | null>(null);

  useEffect(() => {
    if (!phoneOk || !navigator.onLine) return;
    let stale = false;
    // Wait until typing stops for half a second, so every letter doesn't send a request.
    const timer = setTimeout(() => {
      api
        .checkDuplicates({ name: askName, phone })
        .then((data) => !stale && setResult({ phone, named, data }))
        // Only a helper: if the check fails, reception can still carry on.
        .catch(() => undefined);
    }, 500);
    return () => {
      stale = true;
      clearTimeout(timer);
    };
  }, [phoneOk, askName, phone, named, key]);

  // Only an answer for this phone number is shown. While a newly typed name is being checked, the last answer
  // for the same number stays on screen, so the box doesn't flash.
  if (!phoneOk || !result || result.phone !== phone || result.data.candidates.length === 0) return null;
  const { candidates } = result.data;

  const row = (c: DuplicateCandidate, strong: boolean) => (
    <li key={c.patient.id} className="flex flex-wrap items-center justify-between gap-2" data-duplicate={c.patient.id}>
      <span>
        <span className="font-medium">{c.patient.name}</span> · <span dir="ltr">{c.patient.phone}</span>
        {/* The real server may not count visits here (it sends 0): then the line is left out instead of a wrong 0. */}
        {c.patient.visits + c.patient.appointments > 0 && (
          <span className="block text-xs opacity-80">{t("dup.counts", { v: c.patient.visits, a: c.patient.appointments })}</span>
        )}
      </span>
      <Button type="button" variant={strong ? "primary" : "secondary"} onClick={() => onUse(c.patient)}>
        {t("dup.use")}
      </Button>
    </li>
  );

  // Phone only, no name yet: everyone registered on this number.
  if (!result.named) {
    return (
      <div className="space-y-2 rounded-lg border border-sky-100 bg-sky-50 px-3 py-2 text-sm text-sky-800" data-duplicate-warning="phone">
        <p className="flex items-start gap-2 font-medium">
          <Phone className="mt-0.5 size-4 shrink-0" aria-hidden />
          {t("dup.phoneTaken")}
        </p>
        <ul className="space-y-2">{candidates.map((c) => row(c, false))}</ul>
        <p className="text-xs opacity-80">{t("dup.phoneHint")}</p>
      </div>
    );
  }

  const exact = candidates.filter((c) => c.match_type === "exact_match");
  const family = candidates.filter((c) => c.match_type === "shared_phone_family");
  const other = candidates.filter((c) => c.match_type !== "exact_match" && c.match_type !== "shared_phone_family");
  // Walk-in: the form already holds that patient's exact name and phone, so the server will use their file.
  const using = mode === "walkIn" && exact.find((c) => c.patient.name === typed && c.patient.phone === phone);

  return (
    <div className="space-y-2" data-duplicate-warning="name">
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
      {/* Same phone, other name: usually a family member, but it may also be this person's own older file
          (a nickname, a typo), so each one can still be chosen. Nothing is blocked. */}
      {family.length > 0 && (
        <div className="space-y-2 rounded-lg border border-sky-100 bg-sky-50 px-3 py-2 text-sm text-sky-800" data-duplicate-family>
          <p className="flex items-start gap-2 font-medium">
            <Users className="mt-0.5 size-4 shrink-0" aria-hidden />
            {t("dup.family")}:
          </p>
          <ul className="space-y-2">{family.map((c) => row(c, false))}</ul>
        </div>
      )}
    </div>
  );
}
