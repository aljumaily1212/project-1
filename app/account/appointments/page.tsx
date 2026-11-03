"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { api, type MyAppointment } from "@/lib/api";
import { doctorName, longDate } from "@/lib/display";
import { errorText, useT } from "@/lib/i18n";
import { useLoad } from "@/lib/useLoad";
import { DayPicker, SlotPicker } from "@/components/booking";
import { Button, Card, EmptyState, ErrorState, PageHeader, StatusBadge, buttonClass } from "@/components/common";
import { CardsSkeleton } from "@/components/skeleton";

function TurnText({ appointment }: { appointment: MyAppointment }) {
  const { t } = useT();
  if (appointment.status === "in_progress") return <>{t("appointments.withDoctor")}</>;
  if (appointment.ahead === 0) return <>{t("appointments.yourTurn")}</>;
  return <>{t("appointments.ahead", { n: appointment.ahead ?? 0 })}</>;
}

function ReschedulePanel({ appointment, onDone, onClose }: { appointment: MyAppointment; onDone: () => void; onClose: () => void }) {
  const { t } = useT();
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await api.rescheduleAppointment(appointment.id, { date, time });
      toast.success(t("appointments.changed"));
      onDone();
    } catch (err) {
      toast.error(errorText(err, t));
      setTime("");
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3 rounded-lg border border-slate-200 p-3">
      <DayPicker
        doctorId={appointment.doctor.id}
        value={date}
        onChange={(next) => {
          setDate(next);
          setTime("");
        }}
      />
      <SlotPicker doctorId={appointment.doctor.id} date={date} kind={appointment.kind} value={time} onPick={setTime} />
      <div className="flex gap-2">
        <Button disabled={!date || !time} loading={saving} onClick={save}>
          {t("appointments.saveChange")}
        </Button>
        <Button variant="secondary" onClick={onClose}>
          {t("appointments.keep")}
        </Button>
      </div>
    </div>
  );
}

function AppointmentCard({ appointment: a, cancelHours, onChanged }: { appointment: MyAppointment; cancelHours: number; onChanged: () => void }) {
  const { t, locale } = useT();
  const [moving, setMoving] = useState(false);

  async function cancel() {
    try {
      await api.cancelAppointment(a.id);
      toast.success(t("appointments.cancelled"));
      onChanged();
    } catch (err) {
      toast.error(errorText(err, t));
    }
  }

  return (
    <Card className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-semibold">{doctorName(a.doctor, locale)}</h2>
        <StatusBadge status={a.status} />
      </div>
      <p className="text-sm text-slate-600">
        {a.patient_name} · {t(`kind.${a.kind}`)}
      </p>
      <p className="text-sm">
        {longDate(a.date, locale)} · <span dir="ltr">{a.time}</span> · {t(`branch.${a.branch}`)}
      </p>

      {a.cancel_reason === "doctor_absent" && (
        <div className="space-y-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          <p>{t("appointments.cancelledAbsent")}</p>
          <Link href="/account" replace className="font-medium underline">
            {t("appointments.bookAgain")}
          </Link>
        </div>
      )}
      {a.late_minutes > 0 && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800" role="status">
          {t("appointments.late", { n: a.late_minutes })}
        </p>
      )}
      {a.ahead !== null && (
        <p className="rounded-lg bg-brand-50 px-3 py-2 text-lg font-bold text-brand-700">
          <TurnText appointment={a} />
        </p>
      )}

      {a.status === "booked" && a.can_change && !moving && (
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => setMoving(true)}>
            {t("appointments.change")}
          </Button>
          <Button variant="danger" onClick={cancel}>
            {t("appointments.cancel")}
          </Button>
        </div>
      )}
      {a.status === "booked" && !a.can_change && (
        <p className="text-xs text-slate-500">{t("appointments.tooLate", { n: cancelHours })}</p>
      )}
      {moving && (
        <ReschedulePanel
          appointment={a}
          onClose={() => setMoving(false)}
          onDone={() => {
            setMoving(false);
            onChanged();
          }}
        />
      )}
    </Card>
  );
}

export default function AppointmentsPage() {
  const { t } = useT();
  const { state, reload } = useLoad(() => Promise.all([api.myAppointments(), api.getSettings()]), "", { every: 4000 });

  return (
    <>
      <PageHeader title={t("appointments.title")} description={t("appointments.subtitle")} />
      {state.status === "loading" && <CardsSkeleton count={2} />}
      {state.status === "error" && <ErrorState message={errorText(state.error, t)} onRetry={reload} />}
      {state.status === "success" && state.data[0].length === 0 && (
        <div className="space-y-4 text-center">
          <EmptyState title={t("appointments.empty")} description={t("appointments.emptyHint")} />
          <Link href="/account" replace className={buttonClass("primary", "h-11 px-5", "default")}>
            {t("appointments.bookNow")}
          </Link>
        </div>
      )}
      {state.status === "success" && (
        <div className="space-y-3">
          {state.data[0].map((a) => (
            <AppointmentCard key={a.id} appointment={a} cancelHours={state.data[1].cancel_hours} onChanged={reload} />
          ))}
        </div>
      )}
    </>
  );
}
