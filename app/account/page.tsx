"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { api, type Doctor, type FamilyMember, type PayChoice, type VisitKind } from "@/lib/api";
import { USE_MOCK } from "@/lib/config";
import { doctorName, doctorSpecialty, money } from "@/lib/display";
import { errorText, useT } from "@/lib/i18n";
import { useLoad } from "@/lib/useLoad";
import { DayPicker, KindPicker, SlotPicker } from "@/components/booking";
import { amountText } from "@/components/money";
import { Button, Card, ErrorState, Field, PageHeader, Select } from "@/components/common";
import { FormSkeleton } from "@/components/skeleton";

function BookingForm({ doctors, family }: { doctors: Doctor[]; family: FamilyMember[] }) {
  const router = useRouter();
  const { t, locale } = useT();
  const [patientId, setPatientId] = useState(family[0].id);
  const [doctorId, setDoctorId] = useState(doctors[0].id);
  const [kind, setKind] = useState<VisitKind>("new");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [pay, setPay] = useState<PayChoice>("clinic");
  // Made once per booking form. If the request is sent twice, the server sees the same key and books only once.
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const rules = useLoad(() => api.bookingRules(patientId), String(patientId));

  const doctor = doctors.find((d) => d.id === doctorId) ?? doctors[0];
  const depositRequired = rules.state.status === "success" && rules.state.data.deposit_required;
  const depositAmount = rules.state.status === "success" ? Math.min(rules.state.data.deposit_amount, doctor.fee) : 0;
  // After too many no-shows, paying at the clinic is not allowed.
  const payChoice: PayChoice = depositRequired && pay === "clinic" ? "deposit" : pay;

  async function confirm() {
    setError("");
    setSaving(true);
    try {
      await api.book({ patient_id: patientId, doctor_id: doctorId, date, time, kind, pay: payChoice, idempotency_key: idempotencyKey });
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
      <Field label={t("book.for")} hint={t("book.forHint")}>
        <Select
          value={patientId}
          onChange={(e) => {
            setPatientId(Number(e.target.value));
            setPay("clinic");
          }}
        >
          {family.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({t(`relation.${p.relation}`)})
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
              setDate("");
              setTime("");
            }}
            className={`w-full rounded-lg border p-3 text-start transition-colors ${
              d.id === doctorId ? "border-brand-500 bg-brand-50" : "border-slate-200 bg-white hover:bg-slate-50"
            }`}
          >
            <span className="block font-semibold">{doctorName(d, locale)}</span>
            <span className="block text-sm text-slate-600">
              {doctorSpecialty(d, locale)} · {money(d.fee)} {t("common.currency")}
            </span>
          </button>
        ))}
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">{t("book.kind")}</p>
        <KindPicker
          doctor={doctor}
          value={kind}
          onChange={(next) => {
            setKind(next);
            setTime("");
          }}
        />
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">{t("book.day")}</p>
        <DayPicker
          doctorId={doctorId}
          value={date}
          onChange={(next) => {
            setDate(next);
            setTime("");
          }}
        />
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">{t("book.time")}</p>
        <SlotPicker doctorId={doctorId} date={date} kind={kind} value={time} onPick={setTime} />
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">{t("book.payment")}</p>
        {depositRequired && rules.state.status === "success" && (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800" role="status">
            {t("book.depositRequired", { n: rules.state.data.no_shows })}
          </p>
        )}
        <div className="grid gap-2 sm:grid-cols-3">
          {(
            [
              { choice: "clinic", label: t("book.payClinic") },
              { choice: "deposit", label: t("book.payDeposit", { amount: amountText(depositAmount, "IQD", t) }) },
              { choice: "full", label: t("book.payFull", { amount: amountText(doctor.fee, "IQD", t) }) },
            ] as const
          ).map(({ choice, label }) => (
            <Button
              key={choice}
              type="button"
              className="h-auto py-2 whitespace-normal"
              variant={payChoice === choice ? "primary" : "secondary"}
              disabled={choice === "clinic" && depositRequired}
              onClick={() => setPay(choice)}
            >
              {label}
            </Button>
          ))}
        </div>
        {USE_MOCK && payChoice !== "clinic" && <p className="text-xs text-slate-500">{t("book.mockPayment")}</p>}
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}

      <Button className="h-11 w-full" disabled={!date || !time} loading={saving} onClick={confirm}>
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
