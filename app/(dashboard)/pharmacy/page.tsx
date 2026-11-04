"use client";

import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { api, type Medicine, type Prescription, type StockItem } from "@/lib/api";
import { allergyMatch } from "@/lib/allergies";
import { dateTime } from "@/lib/display";
import { errorText, useT } from "@/lib/i18n";
import { useLoad } from "@/lib/useLoad";
import { dispenseSchema, type DispenseForm } from "@/lib/validation";
import { Button, Card, EmptyState, ErrorState, Field, Input, MedicineList, PageHeader, Select } from "@/components/common";
import { PrintButton, PrintSection } from "@/components/print";
import { AlertsBanner } from "@/components/medical-alerts";
import { CardsSkeleton } from "@/components/skeleton";
import { StockAlerts, unitText } from "@/components/stock";

// The doctor writes the dose like "3 / 1". Its first number is a good first guess for times a day.
function timesFromDose(dose: string) {
  const times = parseInt(dose, 10);
  return times >= 1 && times <= 4 ? (String(times) as "1" | "2" | "3" | "4") : "1";
}

// Guesses which shelf item a prescribed medicine is: the same name, or else the same first word ("Paracetamol").
function matchStock(medicine: Medicine, stock: StockItem[]) {
  const name = medicine.name.trim().toLowerCase();
  const usable = stock.filter((s) => s.level !== "out" && s.expiry !== "expired");
  const exact = usable.find((s) => s.name.toLowerCase() === name);
  const firstWord = name.split(" ")[0];
  return exact ?? usable.find((s) => s.name.toLowerCase().split(" ")[0] === firstWord);
}

function DispenseForm({ prescription, stock, onDone, onCancel }: { prescription: Prescription; stock: StockItem[]; onDone: () => void; onCancel: () => void }) {
  const { t } = useT();
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<DispenseForm>({
    resolver: zodResolver(dispenseSchema),
    defaultValues: {
      lines: prescription.medicines.map((m) => {
        const match = matchStock(m, stock);
        const times = timesFromDose(m.dose);
        // Enough for the whole course: times a day × days.
        return { stock_id: match ? String(match.id) : "", quantity: match ? Number(times) * m.days : 0, times_per_day: times, timing: "after_food", note: "" };
      }),
    },
  });
  const lines = useWatch({ control, name: "lines" });

  async function onSubmit(values: DispenseForm) {
    try {
      await api.dispense(prescription.id, {
        lines: values.lines.map((l) => ({
          stock_id: l.stock_id ? Number(l.stock_id) : null,
          quantity: l.stock_id ? l.quantity : 0,
          instructions: { times_per_day: Number(l.times_per_day), timing: l.timing, note: l.note },
        })),
      });
      toast.success(t("pharmacy.done"));
      onDone();
    } catch (err) {
      toast.error(errorText(err, t));
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-3 border-t border-slate-200 pt-3">
      {prescription.medicines.map((m, index) => {
        const chosen = stock.find((s) => String(s.id) === lines?.[index]?.stock_id);
        const tooMany = chosen && (lines?.[index]?.quantity ?? 0) > chosen.quantity;
        const times = Number(lines?.[index]?.times_per_day ?? 0);
        return (
          <div key={index} className="space-y-2 rounded-lg border border-slate-200 p-3">
            <p className="text-sm font-semibold" dir="ltr">
              {m.name}
            </p>
            <div className="grid gap-2 sm:grid-cols-[1fr_8rem]">
              <Field label={t("pharmacy.fromStock")}>
                <Select {...register(`lines.${index}.stock_id`)}>
                  <option value="">{t("pharmacy.notFromStock")}</option>
                  {stock.map((s) => (
                    <option key={s.id} value={s.id} disabled={s.level === "out" || s.expiry === "expired"}>
                      {s.name} · {unitText(s.quantity, s.unit, t)}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label={t("pharmacy.quantity")} error={errors.lines?.[index]?.quantity?.message}>
                <Input
                  type="number"
                  min={0}
                  dir="ltr"
                  disabled={!chosen}
                  invalid={!!errors.lines?.[index]?.quantity}
                  {...register(`lines.${index}.quantity`, { valueAsNumber: true })}
                />
              </Field>
            </div>
            {tooMany && <p className="text-xs text-red-700">{t("pharmacy.notEnough", { n: unitText(chosen.quantity, chosen.unit, t) })}</p>}
            {chosen && times > 0 && (
              <p className="text-xs text-slate-500">{t("pharmacy.courseNeeds", { days: m.days, n: unitText(times * m.days, chosen.unit, t) })}</p>
            )}
            <p className="pt-1 text-sm font-medium">{t("pharmacy.howToTake")}</p>
            <div className="grid gap-2 sm:grid-cols-2">
              <Field label={t("pharmacy.timesPerDay")}>
                <Select {...register(`lines.${index}.times_per_day`)}>
                  {(["1", "2", "3", "4", "0"] as const).map((n) => (
                    <option key={n} value={n}>
                      {t(`dose.times.${n}`)}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label={t("pharmacy.timing")}>
                <Select {...register(`lines.${index}.timing`)}>
                  <option value="after_food">{t("dose.timing.after_food")}</option>
                  <option value="before_food">{t("dose.timing.before_food")}</option>
                  <option value="any">{t("dose.timing.any")}</option>
                </Select>
              </Field>
            </div>
            <Field label={t("pharmacy.note")} error={errors.lines?.[index]?.note?.message}>
              <Input placeholder={t("pharmacy.notePlaceholder")} invalid={!!errors.lines?.[index]?.note} {...register(`lines.${index}.note`)} />
            </Field>
          </div>
        );
      })}
      <div className="flex gap-2">
        <Button type="submit" className="flex-1" loading={isSubmitting}>
          {t("pharmacy.confirmDispense")}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>
          {t("common.cancel")}
        </Button>
      </div>
    </form>
  );
}

function PrescriptionCard({ prescription, stock, onDispensed }: { prescription: Prescription; stock: StockItem[]; onDispensed: () => void }) {
  const { t, locale } = useT();
  const [open, setOpen] = useState(false);
  return (
    <Card className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-semibold">{prescription.patient_name}</h3>
        {prescription.dispensed && (
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">{t("pharmacy.dispensed")}</span>
        )}
        {prescription.expired && (
          <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">{t("pharmacy.expired")}</span>
        )}
      </div>
      <AlertsBanner alerts={{ allergies: prescription.allergies, conditions: [], blood_type: null }} quiet />
      <MedicineList medicines={prescription.medicines} />
      {/* A medicine that matches an allergy gets its own line, so the pharmacist checks with the doctor before giving it. */}
      {prescription.medicines.map((m, index) => {
        const allergy = allergyMatch(m.name, prescription.allergies);
        return (
          allergy && (
            <p key={index} className="text-sm font-medium text-red-700" role="alert" data-allergy-conflict>
              {t("alerts.pharmacyConflict", { medicine: m.name, allergy })}
            </p>
          )
        );
      })}
      {!prescription.dispensed && (
        <p className="text-xs text-slate-500">{t("pharmacy.validUntil", { date: dateTime(prescription.expires_at, locale) })}</p>
      )}
      <PrintButton title={t("print.prescription")} subject={prescription.patient_name} label={t("print.prescriptionButton")}>
        {() => (
          <>
            <PrintSection title={t("visit.prescription")}>
              <p>{t("print.issued", { date: dateTime(prescription.created_at, locale) })}</p>
              <MedicineList medicines={prescription.medicines} />
              <p>{prescription.dispensed ? t("pharmacy.dispensed") : t("pharmacy.validUntil", { date: dateTime(prescription.expires_at, locale) })}</p>
            </PrintSection>
            <p className="pt-10">{t("print.pharmacistSign")} ____________________</p>
          </>
        )}
      </PrintButton>
      {!prescription.dispensed && !prescription.expired && !open && (
        <Button className="w-full" onClick={() => setOpen(true)}>
          {t("pharmacy.dispense")}
        </Button>
      )}
      {open && (
        <DispenseForm
          prescription={prescription}
          stock={stock}
          onCancel={() => setOpen(false)}
          onDone={() => {
            setOpen(false);
            onDispensed();
          }}
        />
      )}
    </Card>
  );
}

export default function PharmacyPage() {
  const { t } = useT();
  const { state, reload, refresh } = useLoad(api.listPrescriptions, "", { every: 4000 });
  const stock = useLoad(api.listStock, "", { every: 10000 });
  const stockItems = stock.state.status === "success" ? stock.state.data : [];

  // After dispensing, both lists change: the prescription moves, and the stock goes down.
  function afterDispense() {
    refresh();
    stock.refresh();
  }

  const waiting = state.status === "success" ? state.data.filter((p) => !p.dispensed) : [];
  const dispensed = state.status === "success" ? state.data.filter((p) => p.dispensed) : [];

  return (
    <>
      <PageHeader title={t("pharmacy.title")} description={t("pharmacy.subtitle")} />
      <StockAlerts items={stockItems} linkToStock />
      {state.status === "loading" && <CardsSkeleton count={2} />}
      {state.status === "error" && <ErrorState message={errorText(state.error, t)} onRetry={reload} />}
      {state.status === "success" && (
        <div className="grid items-start gap-6 lg:grid-cols-2">
          <section className="space-y-3">
            <h2 className="font-semibold">{t("pharmacy.waiting")}</h2>
            {waiting.length === 0 && <EmptyState title={t("pharmacy.noWaiting")} />}
            {waiting.map((p) => (
              <PrescriptionCard key={p.id} prescription={p} stock={stockItems} onDispensed={afterDispense} />
            ))}
          </section>
          <section className="space-y-3">
            <h2 className="font-semibold">{t("pharmacy.dispensed")}</h2>
            {dispensed.length === 0 && <EmptyState title={t("pharmacy.noDispensed")} />}
            {dispensed.map((p) => (
              <PrescriptionCard key={p.id} prescription={p} stock={stockItems} onDispensed={afterDispense} />
            ))}
          </section>
        </div>
      )}
    </>
  );
}
