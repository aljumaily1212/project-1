"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { api, type Expense, type ExpenseCategory } from "@/lib/api";
import { useSession } from "@/lib/auth";
import { fullDate } from "@/lib/display";
import { sheet } from "@/lib/excel";
import { errorText, useT } from "@/lib/i18n";
import { useLoad } from "@/lib/useLoad";
import { expenseSchema, localToday, type ExpenseForm } from "@/lib/validation";
import { Button, Card, EmptyState, ErrorState, Field, Input, PageHeader, Select } from "@/components/common";
import { ExportButton } from "@/components/export-button";
import { MonthPicker, thisMonth } from "@/components/finance";
import { AmountsText, amountText } from "@/components/money";
import { CardsSkeleton } from "@/components/skeleton";

const CATEGORIES: ExpenseCategory[] = ["rent", "salaries", "power", "supplies", "medicines", "maintenance", "other"];

function AddExpense({ onAdded }: { onAdded: () => void }) {
  const { t } = useT();
  const empty: ExpenseForm = { date: localToday(), category: "supplies", amount: 0, currency: "IQD", note: "" };
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ExpenseForm>({ resolver: zodResolver(expenseSchema), defaultValues: empty });

  async function onSubmit(values: ExpenseForm) {
    try {
      await api.addExpense(values);
      toast.success(t("expenses.added"));
      reset(empty);
      onAdded();
    } catch (err) {
      toast.error(errorText(err, t));
    }
  }

  return (
    <Card>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-3">
        <h2 className="font-semibold">{t("expenses.add")}</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t("expenses.date")} error={errors.date?.message}>
            <Input type="date" dir="ltr" invalid={!!errors.date} {...register("date")} />
          </Field>
          <Field label={t("expenses.category")}>
            <Select {...register("category")}>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {t(`expenses.cat.${c}`)}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-[1fr_7rem] gap-3">
          <Field label={t("expenses.amount")} error={errors.amount?.message}>
            <Input type="number" min={0} step={250} dir="ltr" invalid={!!errors.amount} {...register("amount", { valueAsNumber: true })} />
          </Field>
          <Field label={t("export.currency")}>
            <Select {...register("currency")}>
              <option value="IQD">{t("common.currency")}</option>
              <option value="USD">{t("common.usd")}</option>
            </Select>
          </Field>
        </div>
        <Field label={t("expenses.note")} error={errors.note?.message}>
          <Input placeholder={t("expenses.notePlaceholder")} invalid={!!errors.note} {...register("note")} />
        </Field>
        <Button type="submit" className="w-full" loading={isSubmitting}>
          {t("expenses.save")}
        </Button>
      </form>
    </Card>
  );
}

function ExpenseRow({ expense, canEdit, onChanged }: { expense: Expense; canEdit: boolean; onChanged: () => void }) {
  const { t } = useT();
  const [voiding, setVoiding] = useState(false);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  async function confirmVoid() {
    setSaving(true);
    try {
      await api.voidExpense(expense.id, reason);
      toast.success(t("expenses.voided"));
      setVoiding(false);
      onChanged();
    } catch (err) {
      toast.error(errorText(err, t));
    }
    setSaving(false);
  }

  return (
    <li className={`space-y-2 px-4 py-3 text-sm ${expense.voided ? "opacity-60" : ""}`} data-expense>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span>
          <span className="font-semibold">{t(`expenses.cat.${expense.category}`)}</span>
          {expense.note && <span className="text-slate-600"> · {expense.note}</span>}
        </span>
        <span className={`font-bold ${expense.voided ? "line-through" : ""}`} dir="auto">
          {amountText(expense.amount, expense.currency, t)}
        </span>
      </div>
      <p className="text-xs text-slate-500">
        {fullDate(expense.date)} · {expense.by}
      </p>
      {expense.voided && (
        <p className="text-xs text-red-700">{t("expenses.voidedBy", { name: expense.voided.by, reason: expense.voided.reason })}</p>
      )}
      {canEdit && !expense.voided && !voiding && (
        <Button variant="ghost" onClick={() => setVoiding(true)}>
          {t("expenses.void")}
        </Button>
      )}
      {voiding && !expense.voided && (
        // A reason is required: a voided expense stays in the books, so others must understand why.
        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-48 flex-1">
            <Field label={t("expenses.voidReason")}>
              <Input value={reason} onChange={(e) => setReason(e.target.value)} />
            </Field>
          </div>
          <Button variant="danger" disabled={reason.trim().length < 3} loading={saving} onClick={confirmVoid}>
            {t("expenses.confirmVoid")}
          </Button>
          <Button variant="secondary" onClick={() => setVoiding(false)}>
            {t("common.cancel")}
          </Button>
        </div>
      )}
    </li>
  );
}

// The month's expenses: totals per category, the list, Excel export. Only the accountant adds or voids.
export function ExpensesPage() {
  const { t } = useT();
  const { session } = useSession();
  const canEdit = session?.user.role === "accountant";
  const [month, setMonth] = useState(thisMonth);
  const { state, reload, refresh } = useLoad(() => api.listExpenses(month), month, { keepPrevious: true });
  const list = state.status === "success" ? state.data : [];
  const counted = list.filter((e) => !e.voided);
  const byCategory = CATEGORIES.map((c) => ({
    category: c,
    total: counted.filter((e) => e.category === c && e.currency === "IQD").reduce((sum, e) => sum + e.amount, 0),
  })).filter((row) => row.total > 0);
  const max = Math.max(1, ...byCategory.map((r) => r.total));
  const total = { IQD: counted.filter((e) => e.currency === "IQD").reduce((s, e) => s + e.amount, 0), USD: counted.filter((e) => e.currency === "USD").reduce((s, e) => s + e.amount, 0) };

  return (
    <>
      <PageHeader
        title={t("expenses.title")}
        description={t("expenses.subtitle")}
        action={
          <ExportButton
            fileName={`expenses-${month}`}
            disabled={list.length === 0}
            sheets={() => [
              sheet(t("expenses.title"), [
                { header: t("expenses.date"), value: (e: Expense) => e.date, width: 12 },
                { header: t("expenses.category"), value: (e: Expense) => t(`expenses.cat.${e.category}`), width: 18 },
                // Voided ones are written as 0, so a SUM gives the real total; the status column says why.
                { header: t("expenses.amount"), value: (e: Expense) => (e.voided ? 0 : e.amount), width: 14 },
                { header: t("export.currency"), value: (e: Expense) => e.currency, width: 10 },
                { header: t("expenses.note"), value: (e: Expense) => e.note || null, width: 28 },
                { header: t("export.by"), value: (e: Expense) => e.by, width: 16 },
                { header: t("expenses.status"), value: (e: Expense) => (e.voided ? `${t("expenses.voidedShort")}: ${e.voided.reason}` : null), width: 28 },
              ], list),
            ]}
          />
        }
      />
      <MonthPicker value={month} onChange={setMonth} />
      <div className="grid items-start gap-4 lg:grid-cols-[1fr_22rem]">
        <div className="space-y-4">
          <Card className="space-y-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-semibold">{t("expenses.monthTotal")}</h2>
              <span className="text-lg font-bold" data-expenses-total>
                <AmountsText amounts={total} />
              </span>
            </div>
            {byCategory.length === 0 && <p className="text-sm text-slate-500">{t("expenses.none")}</p>}
            <ul className="space-y-2.5">
              {byCategory.map((row) => (
                <li key={row.category} className="space-y-1 text-sm">
                  <div className="flex justify-between gap-2">
                    <span>{t(`expenses.cat.${row.category}`)}</span>
                    <span className="font-semibold">{amountText(row.total, "IQD", t)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100">
                    <div className="h-2 rounded-full bg-brand-500" style={{ width: `${(row.total / max) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          </Card>
          {state.status === "loading" && <CardsSkeleton count={2} />}
          {state.status === "error" && <ErrorState message={errorText(state.error, t)} onRetry={reload} />}
          {state.status === "success" &&
            (list.length === 0 ? (
              <EmptyState title={t("expenses.none")} />
            ) : (
              <Card className="p-0">
                <ul className="divide-y divide-slate-200">
                  {list.map((e) => (
                    <ExpenseRow key={e.id} expense={e} canEdit={canEdit} onChanged={refresh} />
                  ))}
                </ul>
              </Card>
            ))}
        </div>
        {canEdit && <AddExpense onAdded={refresh} />}
      </div>
    </>
  );
}
