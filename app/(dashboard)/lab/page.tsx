"use client";

import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { z } from "zod";
import { api, type LabOrder, type LabStatus } from "@/lib/api";
import { dateTime } from "@/lib/display";
import { errorText, useT } from "@/lib/i18n";
import { useLoad } from "@/lib/useLoad";
import { resultSchema } from "@/lib/validation";
import { Button, Card, EmptyState, ErrorState, Field, Input, PageHeader } from "@/components/common";
import { ResultView, serviceName } from "@/components/result-view";
import { CardsSkeleton } from "@/components/skeleton";

type ResultForm = z.input<typeof resultSchema>;

const TABS: LabStatus[] = ["requested", "entered", "confirmed"];

function ResultEntry({ order, onSaved, onCancel }: { order: LabOrder; onSaved: () => void; onCancel?: () => void }) {
  const { t } = useT();
  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ResultForm>({
    resolver: zodResolver(resultSchema),
    // X-rays usually come back as images, so they start on the file option.
    defaultValues: order.test.kind === "xray" ? { type: "file" } : { type: "number", unit: "" },
  });
  const type = useWatch({ control, name: "type" });
  const fieldErrors = errors as Partial<Record<"value" | "unit" | "file", { message?: string }>>;

  async function onSubmit(values: ResultForm) {
    try {
      await api.saveResult(order.id, resultSchema.parse(values));
      toast.success(t("lab.saved"));
      onSaved();
    } catch (err) {
      toast.error(errorText(err, t));
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-3 rounded-lg border border-slate-200 p-3">
      <div className="grid grid-cols-2 gap-2">
        {(["number", "file"] as const).map((option) => (
          <Button key={option} type="button" variant={type === option ? "primary" : "secondary"} onClick={() => setValue("type", option)}>
            {t(`lab.type.${option}`)}
          </Button>
        ))}
      </div>
      {type === "number" ? (
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("lab.value")} error={fieldErrors.value?.message}>
            <Input type="number" step="any" dir="ltr" invalid={!!fieldErrors.value} {...register("value", { valueAsNumber: true })} />
          </Field>
          <Field label={t("lab.unit")} error={fieldErrors.unit?.message}>
            <Input dir="ltr" placeholder="mg/dL" invalid={!!fieldErrors.unit} {...register("unit")} />
          </Field>
        </div>
      ) : (
        <Field label={t("lab.file")} hint={t("lab.fileHint")} error={fieldErrors.file?.message}>
          <Input
            type="file"
            accept="application/pdf,image/png,image/jpeg"
            invalid={!!fieldErrors.file}
            onChange={(e) => setValue("file", e.target.files?.[0] as File, { shouldValidate: true })}
          />
        </Field>
      )}
      <div className="flex gap-2">
        <Button type="submit" loading={isSubmitting}>
          {t("lab.save")}
        </Button>
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel}>
            {t("appointments.keep")}
          </Button>
        )}
      </div>
    </form>
  );
}

function OrderCard({ order, onChanged }: { order: LabOrder; onChanged: () => void }) {
  const { t, locale } = useT();
  const [editing, setEditing] = useState(false);

  async function confirm() {
    try {
      await api.confirmResult(order.id);
      toast.success(t("lab.confirmed"));
      onChanged();
    } catch (err) {
      toast.error(errorText(err, t));
    }
  }

  return (
    <Card className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-semibold">
          {serviceName(order.test, locale)} · {order.patient_name}
        </h3>
        <time className="text-xs text-slate-500">{dateTime(order.requested_at, locale)}</time>
      </div>
      <p className="text-sm text-slate-600">{t("lab.requestedBy", { name: order.doctor_name })}</p>

      {order.result && <ResultView result={order.result} />}

      {order.status === "requested" && <ResultEntry order={order} onSaved={onChanged} />}
      {order.status === "entered" && !editing && (
        <div className="flex flex-wrap gap-2">
          <Button onClick={confirm}>{t("lab.confirm")}</Button>
          <Button variant="secondary" onClick={() => setEditing(true)}>
            {t("lab.edit")}
          </Button>
        </div>
      )}
      {order.status === "confirmed" && !editing && (
        <Button variant="secondary" onClick={() => setEditing(true)}>
          {t("lab.correct")}
        </Button>
      )}
      {editing && (
        <ResultEntry
          order={order}
          onCancel={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            onChanged();
          }}
        />
      )}

      {order.history.length > 0 && (
        <details className="text-sm">
          <summary className="cursor-pointer font-medium">{t("lab.history", { n: order.history.length })}</summary>
          <ul className="mt-2 space-y-2">
            {order.history.map((edit, index) => (
              <li key={index} className="rounded-lg bg-slate-100 p-2">
                <p className="text-xs text-slate-500">{t("lab.changedBy", { name: edit.by, at: dateTime(edit.at, locale) })}</p>
                <ResultView result={edit.before} />
              </li>
            ))}
          </ul>
        </details>
      )}
    </Card>
  );
}

export default function LabPage() {
  const { t } = useT();
  const { state, reload } = useLoad(api.listLabOrders, "", { every: 5000 });
  const [tab, setTab] = useState<LabStatus>("requested");

  const orders = state.status === "success" ? state.data.filter((o) => o.status === tab) : [];

  return (
    <>
      <PageHeader title={t("lab.title")} description={t("lab.subtitle")} />
      <div className="mb-4 flex flex-wrap gap-2">
        {TABS.map((item) => (
          <Button key={item} variant={item === tab ? "primary" : "secondary"} onClick={() => setTab(item)}>
            {t(`lab.tab.${item}`)}
            {state.status === "success" && ` (${state.data.filter((o) => o.status === item).length})`}
          </Button>
        ))}
      </div>
      {state.status === "loading" && <CardsSkeleton count={2} />}
      {state.status === "error" && <ErrorState message={errorText(state.error, t)} onRetry={reload} />}
      {state.status === "success" && orders.length === 0 && <EmptyState title={t("lab.empty")} />}
      <div className="grid items-start gap-3 lg:grid-cols-2">
        {orders.map((o) => (
          <OrderCard key={o.id} order={o} onChanged={reload} />
        ))}
      </div>
    </>
  );
}
