"use client";

import { Banknote, Clock, CreditCard, Undo2, XCircle } from "lucide-react";
import type { PaymentLogEntry } from "@/lib/api";
import { dateTime, longDate } from "@/lib/display";
import { useT, type MessageKey } from "@/lib/i18n";
import { amountText } from "@/components/money";

// What happened, in a few words: "Online payment", "Cash refund", "Online payment didn't go through · Card declined".
function titleOf(entry: PaymentLogEntry, t: ReturnType<typeof useT>["t"]) {
  if (entry.kind === "attempt") {
    return `${t("paylog.attempt")} · ${t(`paylog.status.${entry.status ?? "created"}` as MessageKey)}`;
  }
  return t(`paylog.${entry.kind}.${entry.method}` as MessageKey);
}

function IconOf({ entry }: { entry: PaymentLogEntry }) {
  const base = "flex size-10 shrink-0 items-center justify-center rounded-full";
  if (entry.kind === "attempt") {
    return (
      <span className={`${base} bg-slate-100 text-slate-500`}>
        {entry.status === "created" ? <Clock className="size-5" aria-hidden /> : <XCircle className="size-5" aria-hidden />}
      </span>
    );
  }
  if (entry.kind !== "payment") {
    return (
      <span className={`${base} bg-amber-100 text-amber-700`}>
        <Undo2 className="size-5" aria-hidden />
      </span>
    );
  }
  return (
    <span className={`${base} bg-emerald-100 text-emerald-700`}>
      {entry.method === "online" ? <CreditCard className="size-5" aria-hidden /> : <Banknote className="size-5" aria-hidden />}
    </span>
  );
}

// A payment history: money received, money given back, and online payments that didn't go through.
// showPatient: on the patient's own page, the family member each line is for. Staff see one patient at a time.
export function PaymentLog({ entries, showPatient }: { entries: PaymentLogEntry[]; showPatient?: boolean }) {
  const { t, locale } = useT();
  return (
    <ul className="divide-y divide-slate-200">
      {entries.map((e) => {
        // Money given back has a minus, like the rest of the app. dir="auto" keeps "د.ع" on the right side in Arabic.
        const sign = e.kind === "refund" || e.kind === "reversal" ? "−" : "";
        const color = e.kind === "payment" ? "text-emerald-700" : e.kind === "attempt" ? "text-slate-400 line-through" : "text-red-700";
        return (
          <li key={e.id} className="flex gap-3 px-4 py-3 text-sm" data-paylog={e.kind}>
            <IconOf entry={e} />
            <div className="min-w-0 flex-1 space-y-0.5">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                <p className="font-semibold">{titleOf(e, t)}</p>
                <p className={`font-bold whitespace-nowrap ${color}`} dir="auto">
                  {sign}
                  {amountText(e.amount, e.currency, t)}
                </p>
              </div>
              <p className="text-slate-600">
                {e.doctor_name}
                {showPatient && ` · ${e.patient_name}`}
                {" · "}
                {t("paylog.visitOn", { date: longDate(e.appointment_date, locale) })}
                {e.appointment_time && (
                  <>
                    {" "}
                    <span dir="ltr">{e.appointment_time}</span>
                  </>
                )}
              </p>
              <p className="text-xs text-slate-500">
                {dateTime(e.at, locale)}
                {e.receipt_no !== null && ` · ${t("paylog.receipt", { n: e.receipt_no })}`}
                {e.method === "cash" && e.by && ` · ${t("paylog.by", { name: e.by })}`}
              </p>
              {e.reason && <p className="text-xs text-slate-600">{t("paylog.reason", { reason: e.reason })}</p>}
              {e.kind === "attempt" && <p className="text-xs text-slate-500">{e.status === "created" ? t("paylog.open") : t("paylog.notCharged")}</p>}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
