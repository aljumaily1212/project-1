"use client";

import { useState } from "react";
import { toast } from "sonner";
import { HeartPulse, TriangleAlert, X } from "lucide-react";
import { api, type BloodType, type MedicalAlerts } from "@/lib/api";
import { errorText, useT } from "@/lib/i18n";
import { Button, Input, Select } from "@/components/common";

const BLOOD_TYPES: BloodType[] = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

// Common long-term diseases, offered as quick buttons so the doctor doesn't have to type them.
const COMMON_CONDITIONS = ["condition.diabetes", "condition.pressure", "condition.asthma", "condition.heart", "condition.thyroid", "condition.kidney"] as const;

export const hasAlerts = (a: MedicalAlerts) => a.allergies.length > 0 || a.conditions.length > 0 || a.blood_type !== null;

// The warning everyone treating the patient sees first. Red for allergies, amber for diseases.
// With nothing recorded it says so, unless `quiet` hides it completely.
export function AlertsBanner({ alerts, quiet }: { alerts: MedicalAlerts; quiet?: boolean }) {
  const { t } = useT();
  if (!hasAlerts(alerts)) {
    return quiet ? null : <p className="text-sm text-slate-500">{t("alerts.none")}</p>;
  }
  return (
    <div className="space-y-1.5 text-sm" data-alerts>
      {alerts.allergies.length > 0 && (
        <p className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 font-medium text-red-800" role="alert">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>
            {t("alerts.allergies")}: <span dir="auto">{alerts.allergies.join("، ")}</span>
          </span>
        </p>
      )}
      {(alerts.conditions.length > 0 || alerts.blood_type) && (
        <p className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-amber-800">
          <HeartPulse className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>
            {alerts.conditions.length > 0 && `${t("alerts.conditions")}: ${alerts.conditions.join("، ")}`}
            {alerts.conditions.length > 0 && alerts.blood_type && " · "}
            {alerts.blood_type && (
              <>
                {t("alerts.bloodType")}: <span dir="ltr">{alerts.blood_type}</span>
              </>
            )}
          </span>
        </p>
      )}
    </div>
  );
}

// A list of names as removable chips, with a box to add more.
function ChipList({ label, items, onChange, placeholder, quick }: {
  label: string;
  items: string[];
  onChange: (items: string[]) => void;
  placeholder: string;
  quick?: string[];
}) {
  const { t } = useT();
  const [text, setText] = useState("");
  const add = (value: string) => {
    const v = value.trim();
    if (v && !items.some((i) => i.toLowerCase() === v.toLowerCase())) onChange([...items, v]);
    setText("");
  };
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {items.map((item) => (
          <span key={item} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-sm">
            <span dir="auto">{item}</span>
            <button type="button" onClick={() => onChange(items.filter((i) => i !== item))} aria-label={t("alerts.removeItem", { name: item })}>
              <X className="size-3.5" aria-hidden />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          value={text}
          placeholder={placeholder}
          onChange={(e) => setText(e.target.value)}
          // Enter adds the name instead of submitting the visit form around it.
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add(text);
            }
          }}
        />
        <Button type="button" variant="secondary" onClick={() => add(text)}>
          {t("alerts.add")}
        </Button>
      </div>
      {quick && (
        <div className="flex flex-wrap gap-1.5">
          {quick
            .filter((q) => !items.includes(q))
            .map((q) => (
              <button key={q} type="button" onClick={() => add(q)} className="rounded-full border border-slate-200 px-2.5 py-0.5 text-xs hover:bg-slate-50">
                + {q}
              </button>
            ))}
        </div>
      )}
    </div>
  );
}

// The doctor's editor for allergies, diseases and blood type. Saved on its own, apart from the visit.
export function AlertsEditor({ patientId, alerts, onSaved, onCancel }: {
  patientId: number;
  alerts: MedicalAlerts;
  onSaved: (alerts: MedicalAlerts) => void;
  onCancel: () => void;
}) {
  const { t } = useT();
  const [allergies, setAllergies] = useState(alerts.allergies);
  const [conditions, setConditions] = useState(alerts.conditions);
  const [bloodType, setBloodType] = useState<BloodType | "">(alerts.blood_type ?? "");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const saved = await api.updatePatientAlerts(patientId, { allergies, conditions, blood_type: bloodType || null });
      toast.success(t("alerts.saved"));
      onSaved(saved);
    } catch (err) {
      toast.error(errorText(err, t));
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4 rounded-lg border border-slate-200 p-3" data-alerts-editor>
      <ChipList label={t("alerts.allergies")} items={allergies} onChange={setAllergies} placeholder={t("alerts.allergyPlaceholder")} />
      <ChipList
        label={t("alerts.conditions")}
        items={conditions}
        onChange={setConditions}
        placeholder={t("alerts.conditionPlaceholder")}
        quick={COMMON_CONDITIONS.map((key) => t(key))}
      />
      <div className="w-40">
        <p className="mb-2 text-sm font-medium">{t("alerts.bloodType")}</p>
        <Select value={bloodType} onChange={(e) => setBloodType(e.target.value as BloodType | "")} aria-label={t("alerts.bloodType")}>
          <option value="">{t("alerts.bloodUnknown")}</option>
          {BLOOD_TYPES.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </Select>
      </div>
      <div className="flex gap-2">
        <Button type="button" loading={saving} onClick={save}>
          {t("alerts.save")}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>
          {t("common.cancel")}
        </Button>
      </div>
    </div>
  );
}
