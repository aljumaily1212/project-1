"use client";

import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { api, type BranchId, type DoctorSchedule, type Shift, type WorkDay } from "@/lib/api";
import { doctorName, longDate } from "@/lib/display";
import { errorText, useT, type MessageKey } from "@/lib/i18n";
import { SHIFT_HOURS } from "@/lib/shifts";
import { useLoad } from "@/lib/useLoad";
import { DAY_CHOICES, scheduleSchema, type ScheduleForm } from "@/lib/validation";
import { Button, Card, ErrorState, Field, Input, PageHeader, Select } from "@/components/common";
import { CardsSkeleton } from "@/components/skeleton";

// The Iraqi week starts on Saturday. Numbers follow JavaScript: 0 is Sunday.
const WEEK_ORDER = [6, 0, 1, 2, 3, 4, 5];

type Choice = ScheduleForm["days"][number];

const toChoice = (day: WorkDay | null): Choice => (day ? (`${day.branch}-${day.shift}` as Choice) : "off");

// withHours: only when the server already works with hours, so it never gets fields it would ignore.
function fromChoice(choice: Choice, hours: { start: string; end: string }, withHours: boolean): WorkDay | null {
  if (choice === "off") return null;
  const [branch, shift] = choice.split("-") as [BranchId, Shift];
  if (!withHours) return { branch, shift };
  return { branch, shift, start: hours.start || SHIFT_HOURS[shift].start, end: hours.end || SHIFT_HOURS[shift].end };
}

// The usual hours of a choice, to fill the boxes when the manager picks another shift.
function defaultHours(choice: Choice) {
  if (choice === "off") return { start: "", end: "" };
  return { ...SHIFT_HOURS[choice.split("-")[1] as Shift] };
}

function choiceLabel(choice: Choice, t: (key: MessageKey) => string) {
  if (choice === "off") return t("doctors.off");
  const [branch, shift] = choice.split("-");
  return `${t(`branch.${branch}` as MessageKey)} · ${t(`shift.${shift}` as MessageKey)}`;
}

function AbsenceForm({ schedule, onDone }: { schedule: DoctorSchedule; onDone: (date: string) => void }) {
  const { t, locale } = useT();
  const [date, setDate] = useState("");
  const [saving, setSaving] = useState(false);

  async function markAbsent() {
    setSaving(true);
    try {
      const { cancelled } = await api.markAbsent(schedule.doctor.id, date);
      toast.success(t("doctors.absentDone", { n: cancelled }));
      onDone(date);
      setDate("");
    } catch (err) {
      toast.error(errorText(err, t));
    }
    setSaving(false);
  }

  return (
    <div className="space-y-3 border-t border-slate-200 pt-4">
      <h3 className="text-sm font-semibold">{t("doctors.absence")}</h3>
      <div className="flex flex-wrap items-end gap-2">
        <Field label={t("doctors.absenceDate")}>
          <Input type="date" dir="ltr" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Button variant="danger" disabled={!date} loading={saving} onClick={markAbsent}>
          {t("doctors.markAbsent")}
        </Button>
      </div>
      {schedule.absences.length > 0 && (
        <p className="text-sm text-slate-600">
          {t("doctors.absences")}: {schedule.absences.map((d) => longDate(d, locale)).join("، ")}
        </p>
      )}
    </div>
  );
}

function DoctorCard({ schedule, onAbsent }: { schedule: DoctorSchedule; onAbsent: (date: string) => void }) {
  const { t, locale } = useT();
  const { doctor } = schedule;
  // The real server doesn't have working hours yet. When its schedule data starts including them, the
  // from / to boxes appear by themselves. The demo data already has them.
  const withHours = schedule.days.some((d) => d !== null && d.start !== undefined);
  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<ScheduleForm>({
    resolver: zodResolver(scheduleSchema),
    defaultValues: {
      fee: doctor.fee,
      clinic_percent: schedule.clinic_percent,
      service_percent: schedule.service_percent,
      new_minutes: doctor.new_minutes,
      followup_minutes: doctor.followup_minutes,
      days: schedule.days.map(toChoice),
      hours: schedule.days.map((d) => ({ start: d?.start ?? "", end: d?.end ?? "" })),
    },
  });
  const days = useWatch({ control, name: "days" });

  async function onSubmit(values: ScheduleForm) {
    try {
      const { hours, ...rest } = values;
      await api.updateSchedule(doctor.id, { ...rest, days: values.days.map((choice, i) => fromChoice(choice, hours[i], withHours)) });
      // No reload: the form already shows the saved values.
      toast.success(t("doctors.saved"));
    } catch (err) {
      toast.error(errorText(err, t));
    }
  }

  return (
    <Card className="space-y-4">
      <h2 className="text-lg font-semibold">{doctorName(doctor, locale)}</h2>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label={t("doctors.fee")} error={errors.fee?.message}>
            <Input type="number" dir="ltr" invalid={!!errors.fee} {...register("fee", { valueAsNumber: true })} />
          </Field>
          <Field label={t("doctors.newMinutes")} error={errors.new_minutes?.message}>
            <Input type="number" dir="ltr" invalid={!!errors.new_minutes} {...register("new_minutes", { valueAsNumber: true })} />
          </Field>
          <Field label={t("doctors.followupMinutes")} error={errors.followup_minutes?.message}>
            <Input type="number" dir="ltr" invalid={!!errors.followup_minutes} {...register("followup_minutes", { valueAsNumber: true })} />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("doctors.clinicPercent")} hint={t("doctors.percentHint")} error={errors.clinic_percent?.message}>
            <Input type="number" dir="ltr" invalid={!!errors.clinic_percent} {...register("clinic_percent", { valueAsNumber: true })} />
          </Field>
          <Field label={t("doctors.servicePercent")} error={errors.service_percent?.message}>
            <Input type="number" dir="ltr" invalid={!!errors.service_percent} {...register("service_percent", { valueAsNumber: true })} />
          </Field>
        </div>

        <fieldset className="space-y-2">
          <legend className="text-sm font-semibold">{t("doctors.week")}</legend>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {WEEK_ORDER.map((index) => (
              <div key={index} className="space-y-2" data-weekday={index}>
                <Field label={t(`weekday.${index}` as MessageKey)}>
                  <Select
                    {...register(`days.${index}`, {
                      // Another shift starts from that shift's usual hours.
                      onChange: (e) => setValue(`hours.${index}`, defaultHours(e.target.value as Choice)),
                    })}
                  >
                    {DAY_CHOICES.map((choice) => (
                      <option key={choice} value={choice}>
                        {choiceLabel(choice, t)}
                      </option>
                    ))}
                  </Select>
                </Field>
                {withHours && days[index] !== "off" && (
                  <div className="grid grid-cols-2 gap-2">
                    <Field label={t("doctors.from")}>
                      <Input type="time" dir="ltr" step={300} {...register(`hours.${index}.start`)} />
                    </Field>
                    <Field label={t("doctors.to")} error={errors.hours?.[index]?.end?.message}>
                      <Input type="time" dir="ltr" step={300} invalid={!!errors.hours?.[index]?.end} {...register(`hours.${index}.end`)} />
                    </Field>
                  </div>
                )}
              </div>
            ))}
          </div>
        </fieldset>

        <Button type="submit" loading={isSubmitting}>
          {t("doctors.save")}
        </Button>
      </form>
      <AbsenceForm schedule={schedule} onDone={onAbsent} />
    </Card>
  );
}

export default function DoctorsPage() {
  const { t } = useT();
  const { state, reload, setData } = useLoad(api.listSchedules);

  // Adds the absence to one doctor without reloading the whole page.
  function addAbsence(doctorId: number, date: string) {
    setData((list) =>
      list.map((s) => (s.doctor.id === doctorId && !s.absences.includes(date) ? { ...s, absences: [...s.absences, date].sort() } : s)),
    );
  }

  return (
    <>
      <PageHeader title={t("doctors.title")} description={t("doctors.subtitle")} />
      {state.status === "loading" && <CardsSkeleton count={2} />}
      {state.status === "error" && <ErrorState message={errorText(state.error, t)} onRetry={reload} />}
      {state.status === "success" && (
        <div className="space-y-4">
          {state.data.map((s) => (
            <DoctorCard key={s.doctor.id} schedule={s} onAbsent={(date) => addAbsence(s.doctor.id, date)} />
          ))}
        </div>
      )}
    </>
  );
}
