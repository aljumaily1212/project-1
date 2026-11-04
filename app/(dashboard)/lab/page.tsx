"use client";

import { useState } from "react";
import { useFieldArray, useForm, useWatch, type Control } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { api, type LabOrder, type LabStatus, type ResultInput, type SampleType } from "@/lib/api";
import { dateTime } from "@/lib/display";
import { errorText, useT } from "@/lib/i18n";
import { useLoad } from "@/lib/useLoad";
import { resultSchema, type ResultForm } from "@/lib/validation";
import { Button, Card, EmptyState, ErrorState, Field, FieldError, Input, PageHeader, Select, Textarea } from "@/components/common";
import { FlagBadge, ResultView, rowFlag, serviceName } from "@/components/result-view";
import { CardsSkeleton } from "@/components/skeleton";

const TABS: LabStatus[] = ["requested", "entered", "confirmed"];
const SAMPLES: SampleType[] = ["blood", "urine", "stool", "swab", "other"];

// An empty number box means "no range".
const numberOrNull = (value: string) => (value === "" ? null : Number(value));

// The form starts from what is already saved when correcting a result, otherwise from the test's usual readings.
function startValues(order: LabOrder): ResultForm {
  const saved = order.result;
  if (saved?.type === "values") return { type: "values", rows: saved.rows, sample: saved.sample, note: saved.note };
  if (saved?.type === "file" || order.test.kind === "xray") return { type: "file", rows: [], sample: "other", note: saved?.type === "file" ? (saved.note ?? "") : "" };
  const template = order.test.template ?? [{ name: "", unit: "", ref_low: null, ref_high: null }];
  // NaN leaves the value box empty, so the lab has to type it.
  return { type: "values", rows: template.map((row) => ({ ...row, value: NaN })), sample: "blood", note: "" };
}

function toInput(values: ResultForm): ResultInput {
  if (values.type === "file") return { type: "file", file: values.file!, note: values.note };
  return { type: "values", rows: values.rows, sample: values.sample, note: values.note };
}

// Shows "high ↑" or "low ↓" next to a reading as soon as the value is typed.
function LiveFlag({ control, index }: { control: Control<ResultForm>; index: number }) {
  const row = useWatch({ control, name: `rows.${index}` });
  if (!row || !Number.isFinite(row.value)) return null;
  return <FlagBadge flag={rowFlag(row)} />;
}

function ResultEntry({ order, onSaved, onCancel }: { order: LabOrder; onSaved: () => void; onCancel?: () => void }) {
  const { t } = useT();
  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ResultForm>({ resolver: zodResolver(resultSchema), defaultValues: startValues(order) });
  const type = useWatch({ control, name: "type" });
  const { fields, append, remove, replace } = useFieldArray({ control, name: "rows" });

  // Switching to a file clears the readings; switching back brings the test's usual readings again.
  function pickType(next: "values" | "file") {
    setValue("type", next);
    if (next === "file") replace([]);
    else if (fields.length === 0) replace(startValues({ ...order, result: null, test: { ...order.test, kind: "test" } }).rows);
  }

  async function onSubmit(values: ResultForm) {
    try {
      await api.saveResult(order.id, toInput(values));
      toast.success(t("lab.saved"));
      onSaved();
    } catch (err) {
      toast.error(errorText(err, t));
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-3 rounded-lg border border-slate-200 p-3">
      <div className="grid grid-cols-2 gap-2">
        {(["values", "file"] as const).map((option) => (
          <Button key={option} type="button" variant={type === option ? "primary" : "secondary"} onClick={() => pickType(option)}>
            {t(`lab.type.${option}`)}
          </Button>
        ))}
      </div>

      {type === "values" ? (
        <>
          <div className="w-48">
            <Field label={t("lab.sample")}>
              <Select {...register("sample")}>
                {SAMPLES.map((sample) => (
                  <option key={sample} value={sample}>
                    {t(`lab.sample.${sample}`)}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <div className="space-y-2">
            {fields.map((field, index) => {
              const rowErrors = errors.rows?.[index];
              return (
                <div key={field.id} data-reading className="space-y-2 rounded-lg bg-slate-50 p-3">
                  <div className="grid gap-2 sm:grid-cols-[2fr_1fr_1fr]">
                    <Field label={t("lab.reading")} error={rowErrors?.name?.message}>
                      <Input dir="ltr" invalid={!!rowErrors?.name} {...register(`rows.${index}.name`)} />
                    </Field>
                    <Field label={t("lab.value")} error={rowErrors?.value?.message}>
                      <Input type="number" step="any" dir="ltr" invalid={!!rowErrors?.value} {...register(`rows.${index}.value`, { valueAsNumber: true })} />
                    </Field>
                    <Field label={t("lab.unit")}>
                      <Input dir="ltr" placeholder="mg/dL" {...register(`rows.${index}.unit`)} />
                    </Field>
                  </div>
                  <div className="flex flex-wrap items-end gap-2">
                    <div className="w-32">
                      <Field label={t("lab.refLow")}>
                        <Input type="number" step="any" dir="ltr" {...register(`rows.${index}.ref_low`, { setValueAs: numberOrNull })} />
                      </Field>
                    </div>
                    <div className="w-32">
                      <Field label={t("lab.refHigh")} error={rowErrors?.ref_high?.message}>
                        <Input
                          type="number"
                          step="any"
                          dir="ltr"
                          invalid={!!rowErrors?.ref_high}
                          {...register(`rows.${index}.ref_high`, { setValueAs: numberOrNull })}
                        />
                      </Field>
                    </div>
                    <div className="mb-2.5 flex-1">
                      <LiveFlag control={control} index={index} />
                    </div>
                    {fields.length > 1 && (
                      <Button type="button" variant="ghost" onClick={() => remove(index)}>
                        {t("lab.removeReading")}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
            {errors.rows?.message && <FieldError error={errors.rows.message} />}
            <Button type="button" variant="secondary" onClick={() => append({ name: "", value: NaN, unit: "", ref_low: null, ref_high: null })}>
              {t("lab.addReading")}
            </Button>
          </div>
        </>
      ) : (
        <Field label={t("lab.file")} hint={t("lab.fileHint")} error={errors.file?.message}>
          <Input
            type="file"
            accept="application/pdf,image/png,image/jpeg"
            invalid={!!errors.file}
            onChange={(e) => setValue("file", e.target.files?.[0], { shouldValidate: true })}
          />
        </Field>
      )}

      <Field label={t("lab.note")} error={errors.note?.message}>
        <Textarea placeholder={t("lab.notePlaceholder")} {...register("note")} />
      </Field>

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
