"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { api, type StockItem } from "@/lib/api";
import { fullDate } from "@/lib/display";
import { errorText, useT } from "@/lib/i18n";
import { useLoad } from "@/lib/useLoad";
import { STOCK_UNITS, receiveSchema, stockSchema, type ReceiveForm, type StockForm } from "@/lib/validation";
import { Button, Card, EmptyState, ErrorState, Field, Input, PageHeader, Select } from "@/components/common";
import { CardsSkeleton } from "@/components/skeleton";
import { StockAlerts, StockBadges, unitText } from "@/components/stock";

const EMPTY: StockForm = { name: "", unit: "tablet", quantity: 0, low_level: 10, expires_on: "" };

// Adds a new item, or edits one. An empty date box means the item has no expiry date.
function StockItemForm({ item, onDone, onCancel }: { item?: StockItem; onDone: () => void; onCancel: () => void }) {
  const { t } = useT();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<StockForm>({
    resolver: zodResolver(stockSchema),
    defaultValues: item ? { ...item, unit: item.unit as StockForm["unit"], expires_on: item.expires_on ?? "" } : EMPTY,
  });

  async function onSubmit(values: StockForm) {
    const body = { ...values, expires_on: values.expires_on || null };
    try {
      if (item) await api.updateStock(item.id, body);
      else await api.createStock(body);
      toast.success(t("stock.saved"));
      onDone();
    } catch (err) {
      toast.error(errorText(err, t));
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t("stock.name")} error={errors.name?.message}>
          <Input dir="ltr" placeholder="Paracetamol 500mg" invalid={!!errors.name} {...register("name")} />
        </Field>
        <Field label={t("stock.unit")}>
          <Select {...register("unit")}>
            {STOCK_UNITS.map((unit) => (
              <option key={unit} value={unit}>
                {t(`stock.unitName.${unit}`)}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label={t("stock.quantity")} error={errors.quantity?.message}>
          <Input type="number" min={0} dir="ltr" invalid={!!errors.quantity} {...register("quantity", { valueAsNumber: true })} />
        </Field>
        <Field label={t("stock.lowLevel")} hint={t("stock.lowLevelHint")} error={errors.low_level?.message}>
          <Input type="number" min={0} dir="ltr" invalid={!!errors.low_level} {...register("low_level", { valueAsNumber: true })} />
        </Field>
        <Field label={t("stock.expiresOn")}>
          <Input type="date" dir="ltr" {...register("expires_on")} />
        </Field>
      </div>
      <div className="flex gap-2">
        <Button type="submit" loading={isSubmitting}>
          {t("stock.save")}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>
          {t("common.cancel")}
        </Button>
      </div>
    </form>
  );
}

// A delivery came in: add to the quantity, and set the new expiry date if there is one.
function ReceiveForm({ item, onDone, onCancel }: { item: StockItem; onDone: () => void; onCancel: () => void }) {
  const { t } = useT();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ReceiveForm>({ resolver: zodResolver(receiveSchema), defaultValues: { quantity: 0, expires_on: "" } });

  async function onSubmit({ quantity, expires_on }: ReceiveForm) {
    try {
      await api.receiveStock(item.id, { quantity, expires_on: expires_on || null });
      toast.success(t("stock.received"));
      onDone();
    } catch (err) {
      toast.error(errorText(err, t));
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-wrap items-end gap-2">
      <div className="w-32">
        <Field label={t("stock.addQuantity")} error={errors.quantity?.message}>
          <Input type="number" min={1} dir="ltr" invalid={!!errors.quantity} {...register("quantity", { valueAsNumber: true })} />
        </Field>
      </div>
      <div className="w-44">
        <Field label={t("stock.newExpiry")}>
          <Input type="date" dir="ltr" {...register("expires_on")} />
        </Field>
      </div>
      <Button type="submit" loading={isSubmitting}>
        {t("stock.receive")}
      </Button>
      <Button type="button" variant="secondary" onClick={onCancel}>
        {t("common.cancel")}
      </Button>
    </form>
  );
}

function StockRow({ item, onChanged }: { item: StockItem; onChanged: () => void }) {
  const { t } = useT();
  const [mode, setMode] = useState<"view" | "receive" | "edit">("view");
  const done = () => {
    setMode("view");
    onChanged();
  };

  return (
    <li data-stock={item.name} className="space-y-3 px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <p className="font-semibold" dir="ltr">
            {item.name}
          </p>
          <p className="text-sm text-slate-500">
            {t("stock.lowAt", { n: item.low_level })}
            {item.expires_on && ` · ${t("stock.expires", { date: fullDate(item.expires_on) })}`}
          </p>
          <StockBadges item={item} />
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-lg font-bold ${item.level === "ok" ? "" : item.level === "low" ? "text-amber-700" : "text-red-700"}`}>
            {unitText(item.quantity, item.unit, t)}
          </span>
          {mode === "view" && (
            <>
              <Button onClick={() => setMode("receive")}>{t("stock.receive")}</Button>
              <Button variant="secondary" onClick={() => setMode("edit")}>
                {t("stock.edit")}
              </Button>
            </>
          )}
        </div>
      </div>
      {mode === "receive" && <ReceiveForm item={item} onDone={done} onCancel={() => setMode("view")} />}
      {mode === "edit" && <StockItemForm item={item} onDone={done} onCancel={() => setMode("view")} />}
    </li>
  );
}

export default function StockPage() {
  const { t } = useT();
  const { state, reload, refresh } = useLoad(api.listStock);
  const [adding, setAdding] = useState(false);
  const [query, setQuery] = useState("");

  const items = state.status === "success" ? state.data.filter((i) => i.name.toLowerCase().includes(query.trim().toLowerCase())) : [];

  return (
    <>
      <PageHeader
        title={t("stock.title")}
        description={t("stock.subtitle")}
        action={!adding && <Button onClick={() => setAdding(true)}>{t("stock.add")}</Button>}
      />
      {state.status === "success" && <StockAlerts items={state.data} />}
      {adding && (
        <Card className="mb-4">
          <h2 className="mb-3 font-semibold">{t("stock.add")}</h2>
          <StockItemForm
            onDone={() => {
              setAdding(false);
              refresh();
            }}
            onCancel={() => setAdding(false)}
          />
        </Card>
      )}
      {state.status === "loading" && <CardsSkeleton count={2} />}
      {state.status === "error" && <ErrorState message={errorText(state.error, t)} onRetry={reload} />}
      {state.status === "success" && (
        <Card className="space-y-3 p-0">
          <div className="px-4 pt-4">
            <Input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("stock.search")} aria-label={t("stock.search")} />
          </div>
          {items.length === 0 ? (
            <div className="p-4">
              <EmptyState title={t("stock.empty")} />
            </div>
          ) : (
            <ul className="divide-y divide-slate-200">
              {items.map((item) => (
                <StockRow key={item.id} item={item} onChanged={refresh} />
              ))}
            </ul>
          )}
        </Card>
      )}
    </>
  );
}
