"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { api, type Day, type Doctor } from "@/lib/api";
import { doctorBranch, doctorName, doctorSpecialty, money } from "@/lib/display";
import { errorText, useT } from "@/lib/i18n";
import { useLoad } from "@/lib/useLoad";
import { Button, Card, EmptyState, ErrorState, Field, PageHeader, Select } from "@/components/common";
import { FormSkeleton, Skeleton } from "@/components/skeleton";

const DAYS: Day[] = ["today", "tomorrow"];

function SlotPicker({ doctorId, day, time, onPick }: { doctorId: number; day: Day; time: string; onPick: (time: string) => void }) {
  const { t } = useT();
  const { state, reload } = useLoad(() => api.doctorSlots(doctorId, day), `${doctorId}|${day}`, { every: 4000 });

  if (state.status === "loading") return <Skeleton className="h-24 w-full" />;
  if (state.status === "error") return <ErrorState message={errorText(state.error, t)} onRetry={reload} />;
  if (!state.data.some((s) => s.available)) return <EmptyState title={t("book.noSlots")} />;

  return (
    <div className="grid grid-cols-3 gap-2">
      {state.data.map((slot) => (
        <Button
          key={slot.time}
          type="button"
          dir="ltr"
          className="h-11"
          variant={slot.time === time ? "primary" : "secondary"}
          disabled={!slot.available}
          onClick={() => onPick(slot.time)}
        >
          {slot.time}
        </Button>
      ))}
    </div>
  );
}

function BookingForm({ doctors, family }: { doctors: Doctor[]; family: { id: number; name: string }[] }) {
  const router = useRouter();
  const { t, locale } = useT();
  const [patientId, setPatientId] = useState(family[0].id);
  const [doctorId, setDoctorId] = useState(doctors[0].id);
  const [day, setDay] = useState<Day>("today");
  const [time, setTime] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function confirm() {
    setError("");
    setSaving(true);
    try {
      await api.book({ patient_id: patientId, doctor_id: doctorId, day, time });
      toast.success(t("book.done"));
      router.replace("/account/appointments");
    } catch (err) {
      setError(errorText(err, t));
      setTime("");
      setSaving(false);
    }
  }

  return (
    <Card className="space-y-5">
      <Field label={t("book.for")}>
        <Select value={patientId} onChange={(e) => setPatientId(Number(e.target.value))}>
          {family.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </Select>
      </Field>

      <div className="space-y-2">
        <p className="text-sm font-medium">{t("book.doctor")}</p>
        {doctors.map((d) => (
          <button
            key={d.id}
            type="button"
            onClick={() => {
              setDoctorId(d.id);
              setTime("");
            }}
            className={`w-full rounded-lg border p-3 text-start transition-colors ${
              d.id === doctorId ? "border-brand-500 bg-brand-50" : "border-slate-200 bg-white hover:bg-slate-50"
            }`}
          >
            <span className="block font-semibold">{doctorName(d, locale)}</span>
            <span className="block text-sm text-slate-600">
              {doctorSpecialty(d, locale)} · {doctorBranch(d, locale)} · {money(d.fee)} {t("common.currency")}
            </span>
          </button>
        ))}
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">{t("book.day")}</p>
        <div className="grid grid-cols-2 gap-2">
          {DAYS.map((item) => (
            <Button
              key={item}
              type="button"
              className="h-11"
              variant={item === day ? "primary" : "secondary"}
              onClick={() => {
                setDay(item);
                setTime("");
              }}
            >
              {t(`day.${item}`)}
            </Button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">{t("book.time")}</p>
        <SlotPicker doctorId={doctorId} day={day} time={time} onPick={setTime} />
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}

      <Button className="h-11 w-full" disabled={!time} loading={saving} onClick={confirm}>
        {t("book.confirm")}
      </Button>
    </Card>
  );
}

export default function BookPage() {
  const { t } = useT();
  const { state, reload } = useLoad(() => Promise.all([api.listDoctors(), api.myFamily()]));

  return (
    <>
      <PageHeader title={t("book.title")} description={t("book.subtitle")} />
      {state.status === "loading" && <FormSkeleton />}
      {state.status === "error" && <ErrorState message={errorText(state.error, t)} onRetry={reload} />}
      {state.status === "success" && <BookingForm doctors={state.data[0]} family={state.data[1]} />}
    </>
  );
}
