"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { api, type Vitals, type VitalsRecord } from "@/lib/api";
import { dateTime } from "@/lib/display";
import { errorText, useT, type MessageKey } from "@/lib/i18n";
import { numberOrNull, vitalsSchema, type VitalsForm as VitalsValues } from "@/lib/validation";
import { Button, Field, Input } from "@/components/common";

type Key = keyof Vitals;
type Flag = "high" | "low" | null;

// The normal range for an adult. Outside it, the reading is flagged for the doctor to look at.
const NORMAL: Partial<Record<Key, [number, number]>> = {
  systolic: [90, 139],
  diastolic: [60, 89],
  temperature: [36, 37.5],
  pulse: [60, 100],
  spo2: [95, 100],
};

export function vitalFlag(key: Key, value: number | null): Flag {
  const range = NORMAL[key];
  if (value === null || !range) return null;
  if (value > range[1]) return "high";
  if (value < range[0]) return "low";
  return null;
}

// Body mass index: weight in kg divided by height in metres, squared. null without both.
export function bmi(v: Vitals) {
  if (!v.weight || !v.height) return null;
  return Math.round((v.weight / (v.height / 100) ** 2) * 10) / 10;
}

const UNITS: Record<Key, string> = { systolic: "", diastolic: "mmHg", temperature: "°C", pulse: "/min", spo2: "%", weight: "kg", height: "cm" };

function Reading({ label, value, flag }: { label: string; value: string; flag: Flag }) {
  const { t } = useT();
  return (
    <span className={`rounded-lg px-2.5 py-1.5 text-sm ${flag === "high" ? "bg-red-50 text-red-800" : flag === "low" ? "bg-amber-50 text-amber-800" : "bg-slate-100"}`}>
      <span className="text-xs opacity-70">{label}</span>{" "}
      <span className="font-semibold" dir="ltr">
        {value}
      </span>
      {flag && <span className="ms-1 text-xs font-medium">{flag === "high" ? `↑ ${t("lab.flag.high")}` : `↓ ${t("lab.flag.low")}`}</span>}
    </span>
  );
}

// One visit's readings as small labels. Abnormal ones are red (high) or amber (low).
export function VitalsSummary({ vitals }: { vitals: Vitals }) {
  const { t } = useT();
  const pressureFlag = vitalFlag("systolic", vitals.systolic) ?? vitalFlag("diastolic", vitals.diastolic);
  const index = bmi(vitals);
  return (
    <div className="flex flex-wrap gap-1.5" data-vitals-summary>
      {vitals.systolic !== null && vitals.diastolic !== null && (
        <Reading label={t("vitals.bp")} value={`${vitals.systolic}/${vitals.diastolic} mmHg`} flag={pressureFlag} />
      )}
      {(["temperature", "pulse", "spo2", "weight", "height"] as const).map(
        (key) =>
          vitals[key] !== null && <Reading key={key} label={t(`vitals.${key}` as MessageKey)} value={`${vitals[key]} ${UNITS[key]}`} flag={vitalFlag(key, vitals[key])} />,
      )}
      {index !== null && <Reading label={t("vitals.bmi")} value={String(index)} flag={index >= 30 ? "high" : index < 18.5 ? "low" : null} />}
    </div>
  );
}

// Earlier visits' readings in a table, newest first, so the doctor can compare.
export function VitalsHistory({ records }: { records: VitalsRecord[] }) {
  const { t, locale } = useT();
  if (records.length === 0) return <p className="text-sm text-slate-500">{t("vitals.noHistory")}</p>;
  const cell = (key: Key, value: number | null) => (
    <td className={`py-1.5 ${vitalFlag(key, value) === "high" ? "font-semibold text-red-700" : vitalFlag(key, value) === "low" ? "font-semibold text-amber-700" : ""}`} dir="ltr">
      {value ?? "—"}
    </td>
  );
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[30rem] text-sm">
        <thead>
          <tr className="text-xs text-slate-500">
            <th className="py-1 text-start font-normal">{t("vitals.date")}</th>
            <th className="py-1 text-start font-normal">{t("vitals.bp")}</th>
            <th className="py-1 text-start font-normal">{t("vitals.temperature")}</th>
            <th className="py-1 text-start font-normal">{t("vitals.pulse")}</th>
            <th className="py-1 text-start font-normal">{t("vitals.spo2")}</th>
            <th className="py-1 text-start font-normal">{t("vitals.weight")}</th>
          </tr>
        </thead>
        <tbody>
          {records.map((r) => (
            <tr key={r.appointment_id} className="border-t border-slate-200">
              <td className="py-1.5 text-slate-500">{dateTime(r.at, locale)}</td>
              <td className={`py-1.5 ${vitalFlag("systolic", r.systolic) ?? vitalFlag("diastolic", r.diastolic) ? "font-semibold text-red-700" : ""}`} dir="ltr">
                {r.systolic !== null && r.diastolic !== null ? `${r.systolic}/${r.diastolic}` : "—"}
              </td>
              {cell("temperature", r.temperature)}
              {cell("pulse", r.pulse)}
              {cell("spo2", r.spo2)}
              {cell("weight", r.weight)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}


const FIELDS: { key: Key; step: string }[] = [
  { key: "systolic", step: "1" },
  { key: "diastolic", step: "1" },
  { key: "temperature", step: "0.1" },
  { key: "pulse", step: "1" },
  { key: "spo2", step: "1" },
  { key: "weight", step: "0.1" },
  { key: "height", step: "1" },
];

// Used by reception (from the queue) and by the doctor. Any reading can be left empty.
export function VitalsEntry({ appointmentId, current, onSaved, onCancel }: {
  appointmentId: number;
  current?: Vitals | null;
  onSaved: (record: VitalsRecord) => void;
  onCancel: () => void;
}) {
  const { t } = useT();
  const empty: VitalsValues = { systolic: null, diastolic: null, temperature: null, pulse: null, spo2: null, weight: null, height: null };
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<VitalsValues>({ resolver: zodResolver(vitalsSchema), defaultValues: current ?? empty });

  async function onSubmit(values: VitalsValues) {
    try {
      const saved = await api.saveVitals(appointmentId, values);
      toast.success(t("vitals.saved"));
      onSaved(saved);
    } catch (err) {
      toast.error(errorText(err, t));
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-3 rounded-lg border border-slate-200 p-3" data-vitals-form>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {FIELDS.map(({ key, step }) => (
          <Field key={key} label={`${t(`vitals.${key}` as MessageKey)}${UNITS[key] ? ` (${UNITS[key]})` : ""}`} error={errors[key]?.message}>
            <Input type="number" step={step} inputMode="decimal" dir="ltr" invalid={!!errors[key]} {...register(key, { setValueAs: numberOrNull })} />
          </Field>
        ))}
      </div>
      <div className="flex gap-2">
        <Button type="submit" loading={isSubmitting}>
          {t("vitals.save")}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>
          {t("common.cancel")}
        </Button>
      </div>
    </form>
  );
}
