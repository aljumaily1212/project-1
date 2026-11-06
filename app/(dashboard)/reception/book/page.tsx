"use client";

import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Search, UserPlus } from "lucide-react";
import { api, type Doctor, type PatientSummary, type VisitKind } from "@/lib/api";
import { doctorName, doctorSpecialty, longDate, money } from "@/lib/display";
import { errorText, useT } from "@/lib/i18n";
import { useLoad } from "@/lib/useLoad";
import { newPatientSchema, type NewPatientForm } from "@/lib/validation";
import { DayPicker, KindPicker, SlotPicker } from "@/components/booking";
import { Button, Card, EmptyState, ErrorState, Field, Input, PageHeader } from "@/components/common";
import { FormSkeleton } from "@/components/skeleton";
import { DuplicateWarning } from "@/components/duplicate-warning";

// Who the booking is for: someone found by the search, or a new caller typed in.
type Who = { kind: "existing"; patient: PatientSummary } | { kind: "new"; name: string; phone: string };

// Step 1: find the caller by name or phone, or add them as a new patient.
function PatientPicker({ noShowLimit, onPick }: { noShowLimit: number; onPick: (who: Who) => void }) {
  const { t } = useT();
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [adding, setAdding] = useState(false);
  // Waits until typing stops for a moment, so every letter doesn't send a request.
  useEffect(() => {
    const timer = setTimeout(() => setSearch(query), 300);
    return () => clearTimeout(timer);
  }, [query]);
  const { state, reload } = useLoad(() => api.searchPatients(search, { limit: 20 }).then((page) => page.items), search, { keepPrevious: true });
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<NewPatientForm>({ resolver: zodResolver(newPatientSchema), defaultValues: { name: "", phone: "" } });
  const [typedName, typedPhone] = useWatch({ control, name: ["name", "phone"] });

  // The duplicate check found this caller: switch to their existing file (with their no-show count).
  async function pickExisting(id: number, phone: string) {
    try {
      const found = (await api.searchPatients(phone, { limit: 20 })).items.find((p) => p.id === id);
      if (found) onPick({ kind: "existing", patient: found });
      else toast.error(t("error.404"));
    } catch (err) {
      toast.error(errorText(err, t));
    }
  }

  if (adding) {
    return (
      <form onSubmit={handleSubmit((values) => onPick({ kind: "new", ...values }))} noValidate className="space-y-3">
        <Field label={t("users.name")} error={errors.name?.message}>
          <Input maxLength={60} placeholder={t("validation.nameExample")} invalid={!!errors.name} {...register("name")} />
        </Field>
        <Field label={t("login.phone")} error={errors.phone?.message}>
          <Input type="tel" inputMode="numeric" dir="ltr" placeholder="07XXXXXXXXX" invalid={!!errors.phone} {...register("phone")} />
        </Field>
        <DuplicateWarning name={typedName} phone={typedPhone} mode="pick" onUse={(p) => void pickExisting(p.id, p.phone)} />
        <div className="flex gap-2">
          <Button type="submit">{t("staffBook.continue")}</Button>
          <Button type="button" variant="secondary" onClick={() => setAdding(false)}>
            {t("common.cancel")}
          </Button>
        </div>
      </form>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute inset-y-0 start-3 my-auto size-4 text-slate-400" aria-hidden />
          <Input
            type="search"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("patients.search")}
            aria-label={t("patients.search")}
            className="h-11 ps-9"
          />
        </div>
        <Button type="button" variant="secondary" className="h-11" onClick={() => setAdding(true)}>
          <UserPlus className="size-4" aria-hidden />
          {t("staffBook.newPatient")}
        </Button>
      </div>
      {state.status === "loading" && <FormSkeleton fields={2} />}
      {state.status === "error" && <ErrorState message={errorText(state.error, t)} onRetry={reload} />}
      {state.status === "success" && state.data.length === 0 && <EmptyState title={t("patients.empty")} />}
      {state.status === "success" && (
        <ul className="max-h-72 divide-y divide-slate-200 overflow-y-auto">
          {state.data.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                data-pick-patient={p.id}
                onClick={() => onPick({ kind: "existing", patient: p })}
                className="flex w-full flex-wrap items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-start hover:bg-slate-100"
              >
                <span>
                  <span className="block font-medium">{p.name}</span>
                  <span className="block text-sm text-slate-500" dir="ltr">
                    {p.phone}
                  </span>
                </span>
                {p.no_shows >= noShowLimit && (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">{t("staffBook.noShows", { n: p.no_shows })}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// Steps 2 and 3: doctor, kind of visit, day and time. Then confirm.
function BookingSteps({ who, doctors, depositAmount, noShowLimit, onBooked, onChangePatient }: {
  who: Who;
  doctors: Doctor[];
  depositAmount: number;
  noShowLimit: number;
  onBooked: (summary: string) => void;
  onChangePatient: () => void;
}) {
  const { t, locale } = useT();
  const [doctorId, setDoctorId] = useState(doctors[0].id);
  const [kind, setKind] = useState<VisitKind>(who.kind === "existing" && who.patient.visits > 0 ? "followup" : "new");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  // One key per booking form, so a double press books only once.
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const doctor = doctors.find((d) => d.id === doctorId) ?? doctors[0];
  const name = who.kind === "existing" ? who.patient.name : who.name;
  const phone = who.kind === "existing" ? who.patient.phone : who.phone;
  const manyNoShows = who.kind === "existing" && who.patient.no_shows >= noShowLimit;

  async function confirm() {
    setSaving(true);
    setError("");
    try {
      await api.staffBook({
        patient_id: who.kind === "existing" ? who.patient.id : null,
        new_patient: who.kind === "new" ? { name: who.name, phone: who.phone } : null,
        doctor_id: doctorId,
        date,
        time,
        kind,
        idempotency_key: idempotencyKey,
      });
      onBooked(t("staffBook.done", { name, doctor: doctorName(doctor, locale), date: longDate(date, locale), time }));
    } catch (err) {
      setError(errorText(err, t));
      setTime("");
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-brand-50 px-4 py-3">
        <p>
          <span className="font-semibold">{name}</span> ·{" "}
          <span dir="ltr" className="text-slate-600">
            {phone}
          </span>
          {who.kind === "new" && <span className="ms-2 text-xs text-brand-700">{t("staffBook.newBadge")}</span>}
        </p>
        <Button type="button" variant="ghost" onClick={onChangePatient}>
          {t("staffBook.changePatient")}
        </Button>
      </div>
      {manyNoShows && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800" role="status">
          {t("staffBook.depositAdvice", { n: who.kind === "existing" ? who.patient.no_shows : 0, amount: money(depositAmount) })}
        </p>
      )}

      <div className="space-y-2">
        <p className="text-sm font-medium">{t("book.doctor")}</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {doctors.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => {
                setDoctorId(d.id);
                setDate("");
                setTime("");
              }}
              className={`rounded-lg border p-3 text-start transition-colors ${d.id === doctorId ? "border-brand-500 bg-brand-50" : "border-slate-200 hover:bg-slate-50"}`}
            >
              <span className="block font-semibold">{doctorName(d, locale)}</span>
              <span className="block text-sm text-slate-500">
                {doctorSpecialty(d, locale)} · {money(d.fee)} {t("common.currency")}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">{t("book.kind")}</p>
        <KindPicker
          doctor={doctor}
          value={kind}
          onChange={(k) => {
            setKind(k);
            setTime("");
          }}
        />
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">{t("book.day")}</p>
        <DayPicker
          doctorId={doctorId}
          value={date}
          onChange={(d) => {
            setDate(d);
            setTime("");
          }}
        />
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">{t("book.time")}</p>
        <SlotPicker doctorId={doctorId} date={date} kind={kind} value={time} onPick={setTime} />
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}
      <Button className="h-11 w-full" disabled={!date || !time} loading={saving} onClick={confirm}>
        {date && time ? t("staffBook.confirm", { date: longDate(date, locale), time }) : t("staffBook.pickTime")}
      </Button>
      <p className="text-center text-xs text-slate-500">{t("staffBook.payAtClinic")}</p>
    </div>
  );
}

export default function ReceptionBookPage() {
  const { t } = useT();
  const doctors = useLoad(api.listDoctors);
  const settings = useLoad(api.getSettings);
  const [who, setWho] = useState<Who | null>(null);
  const [lastBooked, setLastBooked] = useState("");
  // Goes up after each booking, so the next caller starts on a clean form.
  const [round, setRound] = useState(0);
  const noShowLimit = settings.state.status === "success" ? settings.state.data.no_show_limit : 3;
  const depositAmount = settings.state.status === "success" ? settings.state.data.deposit_amount : 0;

  return (
    <>
      <PageHeader title={t("staffBook.title")} description={t("staffBook.subtitle")} />
      {lastBooked && (
        <p className="mb-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800" role="status" data-booked>
          {lastBooked}
        </p>
      )}
      {doctors.state.status === "loading" && <FormSkeleton />}
      {doctors.state.status === "error" && <ErrorState message={errorText(doctors.state.error, t)} onRetry={doctors.reload} />}
      {doctors.state.status === "success" && (
        <Card className="space-y-4">
          <h2 className="font-semibold">{who ? t("staffBook.step2") : t("staffBook.step1")}</h2>
          {who ? (
            <BookingSteps
              key={round}
              who={who}
              doctors={doctors.state.data}
              depositAmount={depositAmount}
              noShowLimit={noShowLimit}
              onChangePatient={() => setWho(null)}
              onBooked={(summary) => {
                toast.success(summary);
                setLastBooked(summary);
                setWho(null);
                setRound((n) => n + 1);
              }}
            />
          ) : (
            <PatientPicker key={round} noShowLimit={noShowLimit} onPick={setWho} />
          )}
        </Card>
      )}
    </>
  );
}
