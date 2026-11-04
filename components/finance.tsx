"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { api, type CountRow, type LedgerEntry } from "@/lib/api";
import { dateTime, money } from "@/lib/display";
import { errorText, useT, type MessageKey } from "@/lib/i18n";
import { useLoad } from "@/lib/useLoad";
import { localToday, type ReverseForm, reverseSchema } from "@/lib/validation";
import { Button, Card, EmptyState, ErrorState, Field, Input } from "@/components/common";
import { AmountsText, amountText } from "@/components/money";
import { CardsSkeleton } from "@/components/skeleton";
import { ExportButton } from "@/components/export-button";
import { sheet } from "@/lib/excel";

// "YYYY-MM" for the current month, the format the month picker uses.
export const thisMonth = () => localToday().slice(0, 7);

export function MonthPicker({ value, onChange }: { value: string; onChange: (month: string) => void }) {
  const { t } = useT();
  return (
    <div className="mb-4 w-48">
      <Field label={t("reports.month")}>
        <Input type="month" dir="ltr" value={value} onChange={(e) => e.target.value && onChange(e.target.value)} />
      </Field>
    </div>
  );
}

// ---------- ledger ----------

function ReverseForm({ entry, onDone, onCancel }: { entry: LedgerEntry; onDone: () => void; onCancel: () => void }) {
  const { t } = useT();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ReverseForm>({ resolver: zodResolver(reverseSchema), defaultValues: { reason: "" } });

  async function onSubmit({ reason }: ReverseForm) {
    try {
      await api.reversePayment(entry.id, reason);
      toast.success(t("ledger.reversed"));
      onDone();
    } catch (err) {
      toast.error(errorText(err, t));
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-2 flex flex-wrap items-end gap-2">
      <div className="min-w-56 flex-1">
        <Field label={t("ledger.reason")} error={errors.reason?.message}>
          <Input invalid={!!errors.reason} {...register("reason")} />
        </Field>
      </div>
      <Button type="submit" variant="danger" loading={isSubmitting}>
        {t("ledger.confirmReverse")}
      </Button>
      <Button type="button" variant="secondary" onClick={onCancel}>
        {t("appointments.keep")}
      </Button>
    </form>
  );
}

function LedgerRow({ entry, canReverse, onChanged }: { entry: LedgerEntry; canReverse: boolean; onChanged: () => void }) {
  const { t, locale } = useT();
  const [reversing, setReversing] = useState(false);
  const negative = entry.kind !== "payment";

  return (
    <li className="py-3 text-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p>
          <span className="font-medium">{entry.patient_name}</span> · {entry.doctor_name} · {t(`payments.kind.${entry.kind}`)} ·{" "}
          {t(`payments.method.${entry.method}`)}
        </p>
        <p className={negative ? "font-semibold text-red-700" : "font-semibold"} dir="ltr">
          {negative ? "-" : ""}
          {amountText(entry.amount, entry.currency, t)}
        </p>
      </div>
      <p className="text-xs text-slate-500">
        {entry.by} · {dateTime(entry.at, locale)}
        {entry.reason && ` · ${entry.reason}`}
      </p>
      {canReverse && entry.reversible && !reversing && (
        <Button variant="ghost" className="mt-1" onClick={() => setReversing(true)}>
          {t("ledger.reverse")}
        </Button>
      )}
      {reversing && (
        <ReverseForm
          entry={entry}
          onCancel={() => setReversing(false)}
          onDone={() => {
            setReversing(false);
            onChanged();
          }}
        />
      )}
    </li>
  );
}

export function LedgerView({ canReverse }: { canReverse: boolean }) {
  const { t, locale } = useT();
  const { state, reload } = useLoad(api.listLedger, "", { every: 10000 });
  const entries = state.status === "success" ? state.data : [];
  return (
    <Card className="space-y-3">
      <div className="flex justify-end">
        <ExportButton
          fileName={`ledger-${localToday()}`}
          disabled={entries.length === 0}
          sheets={() => [
            sheet(t("ledger.title"), [
              { header: t("export.date"), value: (e) => dateTime(e.at, locale), width: 22 },
              { header: t("export.patient"), value: (e) => e.patient_name, width: 22 },
              { header: t("export.doctor"), value: (e) => e.doctor_name, width: 18 },
              { header: t("export.kind"), value: (e) => t(`payments.kind.${e.kind}`), width: 12 },
              { header: t("export.method"), value: (e) => t(`payments.method.${e.method}`), width: 12 },
              // Refunds and reversals are negative, so a SUM in Excel gives the real total.
              { header: t("export.amount"), value: (e) => (e.kind === "payment" ? e.amount : -e.amount), width: 14 },
              { header: t("export.currency"), value: (e) => e.currency, width: 10 },
              { header: t("export.by"), value: (e) => e.by, width: 16 },
              { header: t("export.reason"), value: (e) => e.reason || null, width: 24 },
            ], entries),
          ]}
        />
      </div>
      {state.status === "loading" && <CardsSkeleton count={2} />}
      {state.status === "error" && <ErrorState message={errorText(state.error, t)} onRetry={reload} />}
      {state.status === "success" && state.data.length === 0 && <EmptyState title={t("ledger.empty")} />}
      {state.status === "success" && (
        <ul className="divide-y divide-slate-200">
          {state.data.map((entry) => (
            <LedgerRow key={entry.id} entry={entry} canReverse={canReverse} onChanged={reload} />
          ))}
        </ul>
      )}
    </Card>
  );
}

// ---------- dues ----------

export function DuesView({ month }: { month: string }) {
  const { t } = useT();
  const { state, reload } = useLoad(() => api.doctorDues(month), month);
  const iqd = (n: number) => amountText(n, "IQD", t);

  if (state.status === "loading") return <CardsSkeleton count={2} />;
  if (state.status === "error") return <ErrorState message={errorText(state.error, t)} onRetry={reload} />;
  const dues = state.data;
  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <ExportButton
          fileName={`doctor-dues-${month}`}
          disabled={dues.length === 0}
          sheets={() => [
            sheet(t("nav.dues"), [
              { header: t("dues.doctor"), value: (d) => d.doctor_name, width: 20 },
              { header: t("dues.visits"), value: (d) => d.visits, width: 10 },
              { header: t("dues.visitIncome"), value: (d) => d.visit_income, width: 16 },
              { header: t("dues.procedureIncome"), value: (d) => d.procedure_income, width: 16 },
              { header: t("dues.doctorShare"), value: (d) => d.doctor_share, width: 16 },
              { header: t("dues.clinicShare"), value: (d) => d.clinic_share, width: 16 },
            ], dues),
          ]}
        />
      </div>
      <Card className="overflow-x-auto scrollbar-thin p-0">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-slate-50 text-start text-slate-600">
            <tr>
              {(["dues.doctor", "dues.visits", "dues.visitIncome", "dues.procedureIncome", "dues.doctorShare", "dues.clinicShare"] as MessageKey[]).map((key) => (
                <th key={key} className="px-4 py-3 text-start font-medium">
                  {t(key)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {state.data.map((row) => (
              <tr key={row.doctor_id} data-doctor={row.doctor_id}>
                <td className="px-4 py-3 font-medium">{row.doctor_name}</td>
                <td className="px-4 py-3">{row.visits}</td>
                <td className="px-4 py-3">{iqd(row.visit_income)}</td>
                <td className="px-4 py-3">{iqd(row.procedure_income)}</td>
                <td className="px-4 py-3 font-semibold text-brand-700">{iqd(row.doctor_share)}</td>
                <td className="px-4 py-3">{iqd(row.clinic_share)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

// ---------- reports ----------

function CountList({ title, rows, label }: { title: string; rows: CountRow[]; label?: (raw: string) => string }) {
  const { t } = useT();
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <Card className="space-y-3">
      <h3 className="font-semibold">{title}</h3>
      {rows.length === 0 && <p className="text-sm text-slate-500">{t("reports.none")}</p>}
      <ul className="space-y-2">
        {rows.map((r) => (
          <li key={r.label} className="text-sm">
            <div className="flex justify-between gap-2">
              <span>{label ? label(r.label) : r.label}</span>
              <span className="font-semibold">{money(r.count)}</span>
            </div>
            {/* A simple bar, so the biggest numbers stand out. */}
            <div className="mt-1 h-1.5 rounded-full bg-slate-100">
              <div className="h-1.5 rounded-full bg-brand-500" style={{ width: `${(r.count / max) * 100}%` }} />
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}

export function ReportView({ month }: { month: string }) {
  const { t } = useT();
  const { state, reload } = useLoad(() => api.report(month), month);

  if (state.status === "loading") return <CardsSkeleton count={4} />;
  if (state.status === "error") return <ErrorState message={errorText(state.error, t)} onRetry={reload} />;
  const r = state.data;
  // The summary as label/value pairs, then one sheet for each breakdown.
  const summary: [string, number][] = [
    [`${t("reports.today")} · ${t("reports.billed")} (IQD)`, r.today_billed.IQD],
    [`${t("reports.today")} · ${t("reports.collected")} (IQD)`, r.today_collected.IQD],
    [`${t("reports.today")} · ${t("reports.pharmacy")}`, r.pharmacy_today],
    [`${t("reports.thisMonth")} · ${t("reports.billed")} (IQD)`, r.billed.IQD],
    [`${t("reports.thisMonth")} · ${t("reports.billed")} (USD)`, r.billed.USD],
    [`${t("reports.thisMonth")} · ${t("reports.collected")} (IQD)`, r.collected.IQD],
    [`${t("reports.thisMonth")} · ${t("reports.collected")} (USD)`, r.collected.USD],
    [`${t("reports.thisMonth")} · ${t("reports.pharmacy")}`, r.pharmacy_month],
    [`${t("reports.thisMonth")} · ${t("reports.expenses")} (IQD)`, r.expenses.IQD],
    [`${t("reports.thisMonth")} · ${t("reports.expenses")} (USD)`, r.expenses.USD],
    [`${t("reports.thisMonth")} · ${t("reports.profit")} (IQD)`, r.profit.IQD],
    [`${t("reports.thisMonth")} · ${t("reports.profit")} (USD)`, r.profit.USD],
  ];
  const countSheet = (title: string, rows: CountRow[], label: (raw: string) => string = (raw) => raw) =>
    sheet(title, [
      { header: t("export.item"), value: (row: CountRow) => label(row.label), width: 24 },
      { header: t("export.count"), value: (row: CountRow) => row.count, width: 10 },
    ], rows);
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <ExportButton
          fileName={`report-${month}`}
          sheets={() => [
            sheet(t("export.summary"), [
              { header: t("export.item"), value: (row: [string, number]) => row[0], width: 40 },
              { header: t("export.amount"), value: (row: [string, number]) => row[1], width: 16 },
            ], summary),
            countSheet(t("reports.byDay"), r.by_day),
            countSheet(t("reports.byDoctor"), r.by_doctor),
            countSheet(t("reports.byBranch"), r.by_branch, (raw) => t(`branch.${raw}` as MessageKey)),
            countSheet(t("reports.topNoShows"), r.top_no_shows),
          ]}
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Card className="space-y-1">
          <p className="text-sm text-slate-500">{t("reports.today")}</p>
          <p data-report="today">
            {t("reports.billed")}: <AmountsText amounts={r.today_billed} />
          </p>
          <p>
            {t("reports.collected")}: <AmountsText amounts={r.today_collected} />
          </p>
          <p data-report="pharmacy-today">
            {t("reports.pharmacy")}: {amountText(r.pharmacy_today, "IQD", t)}
          </p>
        </Card>
        <Card className="space-y-1">
          <p className="text-sm text-slate-500">{t("reports.thisMonth")}</p>
          <p data-report="month">
            {t("reports.billed")}: <AmountsText amounts={r.billed} />
          </p>
          <p>
            {t("reports.collected")}: <AmountsText amounts={r.collected} />
          </p>
          <p>
            {t("reports.pharmacy")}: {amountText(r.pharmacy_month, "IQD", t)}
          </p>
          <p>
            {t("reports.expenses")}: <AmountsText amounts={r.expenses} />
          </p>
          <p className={`text-base font-bold ${r.profit.IQD < 0 ? "text-red-700" : "text-emerald-700"}`} data-report="profit">
            {t("reports.profit")}: <AmountsText amounts={r.profit} />
          </p>
        </Card>
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        <CountList title={t("reports.byDay")} rows={r.by_day} />
        <CountList title={t("reports.byDoctor")} rows={r.by_doctor} />
        <CountList title={t("reports.byBranch")} rows={r.by_branch} label={(raw) => t(`branch.${raw}` as MessageKey)} />
        <CountList title={t("reports.topNoShows")} rows={r.top_no_shows} />
      </div>
    </div>
  );
}
