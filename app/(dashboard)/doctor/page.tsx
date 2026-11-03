"use client";

import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { api, type Service, type StaffAppointment } from "@/lib/api";
import { useSession } from "@/lib/auth";
import { errorText, useT } from "@/lib/i18n";
import { useLoad } from "@/lib/useLoad";
import { visitSchema, type VisitForm } from "@/lib/validation";
import { Button, Card, EmptyState, ErrorState, Field, Input, PageHeader, StatusBadge, Textarea } from "@/components/common";
import { ResultView, serviceName } from "@/components/result-view";
import { CardsSkeleton } from "@/components/skeleton";

function History({ patientId }: { patientId: number }) {
  const { t, locale } = useT();
  const { state, reload } = useLoad(() => api.patientHistory(patientId), String(patientId));

  if (state.status === "loading") return <CardsSkeleton count={1} />;
  if (state.status === "error") return <ErrorState message={errorText(state.error, t)} onRetry={reload} />;
  if (state.data.length === 0) return <p className="text-sm text-slate-500">{t("doctor.noHistory")}</p>;
  return (
    <div className="space-y-2">
      {state.data.map((v) => (
        <div key={v.id} className="rounded-lg bg-brand-50 p-3 text-sm">
          <p>
            {t("visit.diagnosis")}: {v.diagnosis}
          </p>
          {v.internal_note && <p className="text-slate-600">{v.internal_note}</p>}
          {v.tests.map((test) => (
            <div key={test.id} className="mt-2 border-t border-brand-100 pt-2">
              <p className="font-medium">
                {serviceName(test.test, locale)} · <span className="text-slate-500">{t(`lab.status.${test.status}`)}</span>
              </p>
              {test.result && <ResultView result={test.result} />}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function VisitForm({ appointment, services, onDone }: { appointment: StaffAppointment; services: Service[]; onDone: () => void }) {
  const { t, locale } = useT();
  // The lab handles tests and X-rays. Procedures are done in the room and only go on the bill.
  const orderable = services.filter((s) => s.kind === "test" || s.kind === "xray");
  const procedures = services.filter((s) => s.kind === "procedure");
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<VisitForm>({
    resolver: zodResolver(visitSchema),
    defaultValues: { diagnosis: "", internal_note: "", medicines: [], test_ids: [], procedure_ids: [] },
  });
  const { fields, append, remove } = useFieldArray({ control, name: "medicines" });

  async function onSubmit(values: VisitForm) {
    try {
      await api.finishVisit(appointment.id, {
        ...values,
        test_ids: values.test_ids.map(Number),
        procedure_ids: values.procedure_ids.map(Number),
      });
      toast.success(t("doctor.finished"));
      onDone();
    } catch (err) {
      toast.error(errorText(err, t));
    }
  }

  return (
    <Card>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">{appointment.patient_name}</h2>
          <StatusBadge status={appointment.status} />
        </div>

        <div className="space-y-2">
          <h3 className="text-sm font-medium">{t("doctor.history")}</h3>
          <History patientId={appointment.patient_id} />
        </div>

        <Field label={t("visit.diagnosis")} error={errors.diagnosis?.message}>
          <Textarea aria-invalid={!!errors.diagnosis || undefined} {...register("diagnosis")} />
        </Field>
        <Field label={t("doctor.internalNote")}>
          <Textarea {...register("internal_note")} />
        </Field>

        <div className="space-y-3">
          <h3 className="text-sm font-medium">{t("visit.prescription")}</h3>
          {fields.map((field, index) => {
            const rowErrors = errors.medicines?.[index];
            return (
              <div key={field.id} className="grid items-start gap-3 rounded-lg border border-slate-200 p-3 sm:grid-cols-[1fr_1fr_6rem_auto]">
                <Field label={t("doctor.medicine")} error={rowErrors?.name?.message}>
                  <Input dir="ltr" invalid={!!rowErrors?.name} {...register(`medicines.${index}.name`)} />
                </Field>
                <Field label={t("doctor.dose")} error={rowErrors?.dose?.message}>
                  <Input dir="ltr" invalid={!!rowErrors?.dose} {...register(`medicines.${index}.dose`)} />
                </Field>
                <Field label={t("doctor.days")} error={rowErrors?.days?.message}>
                  <Input type="number" min={1} invalid={!!rowErrors?.days} {...register(`medicines.${index}.days`, { valueAsNumber: true })} />
                </Field>
                <Button type="button" variant="danger" className="sm:mt-7" onClick={() => remove(index)}>
                  {t("doctor.removeMedicine")}
                </Button>
              </div>
            );
          })}
          <Button type="button" variant="secondary" onClick={() => append({ name: "", dose: "", days: 1 })}>
            {t("doctor.addMedicine")}
          </Button>
        </div>

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">{t("doctor.tests")}</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {orderable.map((s) => (
              <label key={s.id} className="flex items-center gap-2 rounded-lg border border-slate-200 p-2 text-sm">
                <input type="checkbox" value={s.id} className="size-4 accent-brand-600" {...register("test_ids")} />
                {serviceName(s, locale)}
              </label>
            ))}
          </div>
        </fieldset>

        {procedures.length > 0 && (
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">{t("doctor.procedures")}</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {procedures.map((s) => (
                <label key={s.id} className="flex items-center gap-2 rounded-lg border border-slate-200 p-2 text-sm">
                  <input type="checkbox" value={s.id} className="size-4 accent-brand-600" {...register("procedure_ids")} />
                  {serviceName(s, locale)}
                </label>
              ))}
            </div>
          </fieldset>
        )}

        <Button type="submit" className="h-11 w-full" loading={isSubmitting}>
          {t("doctor.finish")}
        </Button>
      </form>
    </Card>
  );
}

export default function DoctorPage() {
  const { t } = useT();
  const { session } = useSession();
  const doctorId = session?.user.doctor_id ?? 0;
  const { state, reload } = useLoad(() => api.doctorQueue(doctorId), String(doctorId), { every: 4000 });
  const services = useLoad(api.listServices);

  async function callNext(id: number) {
    try {
      await api.startVisit(id);
      reload();
    } catch (err) {
      toast.error(errorText(err, t));
    }
  }

  const current = state.status === "success" ? state.data.find((a) => a.status === "in_progress") : undefined;
  const waiting = state.status === "success" ? state.data.filter((a) => a.status === "arrived") : [];

  return (
    <>
      <PageHeader title={t("doctor.title")} description={t("doctor.subtitle")} />
      {state.status === "loading" && <CardsSkeleton count={2} />}
      {state.status === "error" && <ErrorState message={errorText(state.error, t)} onRetry={reload} />}
      {state.status === "success" && (
        <div className="grid items-start gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            {current ? (
              <VisitForm key={current.id} appointment={current} services={services.state.status === "success" ? services.state.data : []} onDone={reload} />
            ) : (
              <EmptyState title={t("doctor.noCurrent")} description={t("doctor.noCurrentHint")} />
            )}
          </div>
          <Card className="space-y-3">
            <h2 className="font-semibold">{t("queue.title")}</h2>
            {waiting.length === 0 && <p className="text-sm text-slate-500">{t("queue.empty")}</p>}
            <ol className="space-y-2">
              {waiting.map((a, index) => (
                <li key={a.id} className="flex items-center justify-between gap-2 text-sm">
                  <span>
                    {index + 1}. {a.patient_name}
                  </span>
                  {a.emergency && (
                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">{t("queue.emergency")}</span>
                  )}
                </li>
              ))}
            </ol>
            {!current && waiting.length > 0 && (
              <Button className="w-full" onClick={() => callNext(waiting[0].id)}>
                {t("doctor.callNext")}
              </Button>
            )}
          </Card>
        </div>
      )}
    </>
  );
}
