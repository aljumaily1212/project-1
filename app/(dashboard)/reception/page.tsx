"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { api, type Doctor } from "@/lib/api";
import { doctorName } from "@/lib/display";
import { errorText, useT } from "@/lib/i18n";
import { useLoad } from "@/lib/useLoad";
import { walkInSchema, type WalkInForm } from "@/lib/validation";
import { Button, Card, EmptyState, ErrorState, Field, Input, PageHeader, Select, StatusBadge } from "@/components/common";
import { CardsSkeleton, FormSkeleton } from "@/components/skeleton";

function QueueCard({ doctor, version }: { doctor: Doctor; version: number }) {
  const { t, locale } = useT();
  const { state, reload } = useLoad(() => api.doctorQueue(doctor.id), `${doctor.id}|${version}`, { every: 4000 });

  return (
    <Card className="space-y-3">
      <h2 className="font-semibold">
        {t("queue.title")}: {doctorName(doctor, locale)}
      </h2>
      {state.status === "loading" && <CardsSkeleton count={1} />}
      {state.status === "error" && <ErrorState message={errorText(state.error, t)} onRetry={reload} />}
      {state.status === "success" && state.data.length === 0 && <p className="text-sm text-slate-500">{t("queue.empty")}</p>}
      {state.status === "success" && (
        <ol className="space-y-2">
          {state.data.map((a, index) => (
            <li key={a.id} className="flex items-center justify-between gap-2 text-sm">
              <span>
                {index + 1}. {a.patient_name}
              </span>
              {a.emergency ? (
                <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">{t("queue.emergency")}</span>
              ) : (
                <StatusBadge status={a.status} />
              )}
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}

function WalkInCard({ doctors, onAdded }: { doctors: Doctor[]; onAdded: () => void }) {
  const { t, locale } = useT();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<WalkInForm>({
    resolver: zodResolver(walkInSchema),
    defaultValues: { name: "", phone: "", doctor_id: String(doctors[0].id), emergency: false },
  });

  async function onSubmit(values: WalkInForm) {
    try {
      const { duplicate } = await api.addWalkIn({
        name: values.name,
        phone: values.phone,
        doctor_id: Number(values.doctor_id),
        emergency: values.emergency,
      });
      if (duplicate) toast.info(t("reception.duplicate"));
      else toast.success(t("reception.added"));
      reset();
      onAdded();
    } catch (err) {
      toast.error(errorText(err, t));
    }
  }

  return (
    <Card>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <h2 className="font-semibold">{t("reception.walkIn")}</h2>
        <Field label={t("reception.name")} error={errors.name?.message}>
          <Input invalid={!!errors.name} {...register("name")} />
        </Field>
        <Field label={t("login.phone")} error={errors.phone?.message}>
          <Input type="tel" inputMode="numeric" dir="ltr" placeholder="07XXXXXXXXX" invalid={!!errors.phone} {...register("phone")} />
        </Field>
        <Field label={t("reception.doctor")}>
          <Select {...register("doctor_id")}>
            {doctors.map((d) => (
              <option key={d.id} value={d.id}>
                {doctorName(d, locale)}
              </option>
            ))}
          </Select>
        </Field>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" className="size-4 accent-brand-600" {...register("emergency")} />
          {t("reception.emergency")}
        </label>
        <Button type="submit" loading={isSubmitting} className="w-full">
          {t("reception.add")}
        </Button>
      </form>
    </Card>
  );
}

export default function ReceptionPage() {
  const { t, locale } = useT();
  const doctors = useLoad(api.listDoctors);
  const booked = useLoad(api.bookedToday, "", { every: 4000 });
  const version = booked.updatedAt ?? 0;

  async function checkIn(id: number, emergency: boolean) {
    try {
      await api.checkIn(id, emergency);
      toast.success(t("reception.checkedIn"));
      booked.reload();
    } catch (err) {
      toast.error(errorText(err, t));
    }
  }

  return (
    <>
      <PageHeader title={t("reception.title")} description={t("reception.subtitle")} />
      {doctors.state.status === "loading" && <FormSkeleton />}
      {doctors.state.status === "error" && <ErrorState message={errorText(doctors.state.error, t)} onRetry={doctors.reload} />}
      {doctors.state.status === "success" && (
        <div className="grid items-start gap-4 lg:grid-cols-2">
          <div className="space-y-4">
            <Card className="space-y-3">
              <h2 className="font-semibold">{t("reception.today")}</h2>
              {booked.state.status === "loading" && <CardsSkeleton count={1} />}
              {booked.state.status === "error" && <ErrorState message={errorText(booked.state.error, t)} onRetry={booked.reload} />}
              {booked.state.status === "success" && booked.state.data.length === 0 && <EmptyState title={t("reception.empty")} />}
              {booked.state.status === "success" &&
                booked.state.data.map((a) => {
                  const doctor = doctors.state.status === "success" ? doctors.state.data.find((d) => d.id === a.doctor_id) : undefined;
                  return (
                    <div key={a.id} data-appointment={a.time} className="space-y-2 border-t border-slate-200 pt-3">
                      <p className="text-sm">
                        <span className="font-semibold">{a.patient_name}</span>
                        {doctor && ` · ${doctorName(doctor, locale)}`} · <span dir="ltr">{a.time}</span>
                      </p>
                      <div className="flex gap-2">
                        <Button onClick={() => checkIn(a.id, false)}>{t("reception.checkIn")}</Button>
                        <Button variant="danger" onClick={() => checkIn(a.id, true)}>
                          {t("reception.emergency")}
                        </Button>
                      </div>
                    </div>
                  );
                })}
            </Card>
            <WalkInCard doctors={doctors.state.data} onAdded={booked.reload} />
          </div>
          <div className="space-y-4">
            {doctors.state.data.map((d) => (
              <QueueCard key={d.id} doctor={d} version={version} />
            ))}
          </div>
        </div>
      )}
    </>
  );
}
