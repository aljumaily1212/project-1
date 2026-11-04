"use client";

import { useState } from "react";
import { toast } from "sonner";
import { api, type Amounts, type CashClosing } from "@/lib/api";
import { dateTime, money } from "@/lib/display";
import { errorText, useT } from "@/lib/i18n";
import { useLoad } from "@/lib/useLoad";
import { Button, Card, EmptyState, ErrorState, Field, Input, PageHeader, Textarea } from "@/components/common";
import { AmountsText } from "@/components/money";
import { CardsSkeleton } from "@/components/skeleton";
import { ExportButton } from "@/components/export-button";
import { sheet } from "@/lib/excel";

// Green when the drawer matches, red when money is missing, amber when there's extra.
function DifferenceBadge({ difference }: { difference: Amounts }) {
  const { t } = useT();
  const short = difference.IQD < 0 || difference.USD < 0;
  const over = !short && (difference.IQD > 0 || difference.USD > 0);
  const style = short ? "bg-red-100 text-red-800" : over ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800";
  const label = short ? t("closing.short") : over ? t("closing.over") : t("closing.match");
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${style}`} data-difference={short ? "short" : over ? "over" : "match"}>
      {label}
      {(short || over) && (
        <span dir="ltr">
          {/* Shown with its sign, so "−5,000" reads as missing and "+5,000" as extra. */}
          (<AmountsText amounts={difference} />)
        </span>
      )}
    </span>
  );
}

// Every closing as a row: who, when, how many payments, expected, counted, and the difference.
export function ClosingsList({ closings }: { closings: CashClosing[] }) {
  const { t, locale } = useT();
  if (closings.length === 0) return <EmptyState title={t("closing.none")} />;
  return (
    <Card className="divide-y divide-slate-200 p-0">
      {closings.map((c) => (
        <div key={c.id} className="space-y-1.5 px-4 py-3 text-sm" data-closing>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-semibold">
              {c.by} · {dateTime(c.closed_at, locale)}
            </span>
            <DifferenceBadge difference={c.difference} />
          </div>
          <p className="text-slate-600">
            {t("closing.paymentsCount", { n: c.payments })} · {t("closing.expected")}: <AmountsText amounts={c.expected} /> · {t("closing.counted")}:{" "}
            <AmountsText amounts={c.counted} />
          </p>
          {c.note && <p className="rounded-lg bg-slate-50 px-3 py-1.5 text-slate-700">“{c.note}”</p>}
        </div>
      ))}
    </Card>
  );
}

// For the accountant and the manager: everyone's closings, newest first.
export function ClosingsPage() {
  const { t, locale } = useT();
  const { state, reload } = useLoad(api.listClosings);
  return (
    <>
      <PageHeader
        title={t("closing.allTitle")}
        description={t("closing.allSubtitle")}
        action={
          state.status === "success" && (
            <ExportButton
              fileName={`drawer-closings-${new Date().toISOString().slice(0, 10)}`}
              disabled={state.data.length === 0}
              sheets={() => [
                sheet(t("closing.allTitle"), [
                  { header: t("export.date"), value: (c: CashClosing) => dateTime(c.closed_at, locale), width: 22 },
                  { header: t("export.by"), value: (c: CashClosing) => c.by, width: 16 },
                  { header: t("closing.paymentsCount", { n: "" }).trim(), value: (c: CashClosing) => c.payments, width: 12 },
                  { header: `${t("closing.expected")} (IQD)`, value: (c: CashClosing) => c.expected.IQD, width: 14 },
                  { header: `${t("closing.counted")} (IQD)`, value: (c: CashClosing) => c.counted.IQD, width: 14 },
                  { header: `${t("export.difference")} (IQD)`, value: (c: CashClosing) => c.difference.IQD, width: 14 },
                  { header: `${t("export.difference")} (USD)`, value: (c: CashClosing) => c.difference.USD, width: 14 },
                  { header: t("closing.note"), value: (c: CashClosing) => c.note || null, width: 30 },
                ], state.data),
              ]}
            />
          )
        }
      />
      {state.status === "loading" && <CardsSkeleton count={2} />}
      {state.status === "error" && <ErrorState message={errorText(state.error, t)} onRetry={reload} />}
      {state.status === "success" && <ClosingsList closings={state.data} />}
    </>
  );
}

// An empty box counts as 0 here: an empty dollar box means no dollars in the drawer.
const amount = (text: string) => (text.trim() === "" ? 0 : Number(text));

// For reception: the open shift, the count, and their own past closings.
export function ShiftClosingPage() {
  const { t, locale } = useT();
  const shift = useLoad(api.shiftSummary, "", { every: 15000 });
  const history = useLoad(api.listClosings);
  const [iqd, setIqd] = useState("");
  const [usd, setUsd] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const counted: Amounts = { IQD: amount(iqd), USD: amount(usd) };
  const valid = iqd.trim() !== "" && Number.isFinite(counted.IQD) && Number.isFinite(counted.USD) && counted.IQD >= 0 && counted.USD >= 0;
  const expected = shift.state.status === "success" ? shift.state.data.expected : null;
  const difference = expected && valid ? { IQD: counted.IQD - expected.IQD, USD: counted.USD - expected.USD } : null;
  // A missing or extra amount must be explained before closing.
  const needsNote = !!difference && (difference.IQD !== 0 || difference.USD !== 0) && note.trim().length < 3;

  async function close() {
    setSaving(true);
    try {
      await api.closeShift({ counted, note });
      toast.success(t("closing.done"));
      setIqd("");
      setUsd("");
      setNote("");
      shift.refresh();
      history.refresh();
    } catch (err) {
      toast.error(errorText(err, t));
    }
    setSaving(false);
  }

  return (
    <>
      <PageHeader title={t("closing.title")} description={t("closing.subtitle")} />
      <div className="grid items-start gap-4 lg:grid-cols-2">
        <Card className="space-y-4">
          {shift.state.status === "loading" && <CardsSkeleton count={1} />}
          {shift.state.status === "error" && <ErrorState message={errorText(shift.state.error, t)} onRetry={shift.reload} />}
          {shift.state.status === "success" && (
            <>
              <div className="space-y-1" data-shift>
                <p className="text-sm text-slate-500">{t("closing.since", { date: dateTime(shift.state.data.opened_at, locale) })}</p>
                <p className="text-sm">{t("closing.paymentsCount", { n: shift.state.data.payments })}</p>
                <p className="text-lg font-bold">
                  {t("closing.expected")}: <AmountsText amounts={shift.state.data.expected} />
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label={t("closing.countIqd")}>
                  <Input type="number" min={0} step={250} inputMode="numeric" dir="ltr" value={iqd} onChange={(e) => setIqd(e.target.value)} />
                </Field>
                <Field label={t("closing.countUsd")} hint={t("closing.usdHint")}>
                  <Input type="number" min={0} inputMode="numeric" dir="ltr" value={usd} onChange={(e) => setUsd(e.target.value)} />
                </Field>
              </div>
              {difference && <DifferenceBadge difference={difference} />}
              <Field label={needsNote ? t("closing.noteRequired") : t("closing.note")}>
                <Textarea value={note} maxLength={300} onChange={(e) => setNote(e.target.value)} placeholder={t("closing.notePlaceholder")} />
              </Field>
              <Button className="h-11 w-full" disabled={!valid || needsNote} loading={saving} onClick={close}>
                {valid ? t("closing.close", { amount: money(counted.IQD) }) : t("closing.enterCount")}
              </Button>
            </>
          )}
        </Card>
        <div className="space-y-3">
          <h2 className="font-semibold">{t("closing.mine")}</h2>
          {history.state.status === "loading" && <CardsSkeleton count={1} />}
          {history.state.status === "error" && <ErrorState message={errorText(history.state.error, t)} onRetry={history.reload} />}
          {history.state.status === "success" && <ClosingsList closings={history.state.data.slice(0, 10)} />}
        </div>
      </div>
    </>
  );
}
