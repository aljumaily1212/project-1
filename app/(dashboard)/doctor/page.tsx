"use client";

import { useState } from "react";
import { toast } from "sonner";
import { api, type Medicine, type StaffAppointment } from "@/lib/api";
import { useSession } from "@/lib/auth";
import { errorText, useT } from "@/lib/i18n";
import { useLoad } from "@/lib/useLoad";
import { Button, Card, EmptyState, ErrorState, Field, Input, MedicineList, PageHeader, StatusBadge, Textarea } from "@/components/common";
import { CardsSkeleton } from "@/components/skeleton";

function History({ patientId }: { patientId: number }) {
  const { t } = useT();
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
        </div>
      ))}
    </div>
  );
}

function VisitForm({ appointment, onDone }: { appointment: StaffAppointment; onDone: () => void }) {
  const { t } = useT();
  const [diagnosis, setDiagnosis] = useState("");
  const [note, setNote] = useState("");
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [medicine, setMedicine] = useState<Medicine>({ name: "", dose: "", days: 1 });
  const [saving, setSaving] = useState(false);

  function addMedicine() {
    setMedicines([...medicines, { ...medicine, name: medicine.name.trim() }]);
    setMedicine({ name: "", dose: "", days: 1 });
  }

  async function finish() {
    setSaving(true);
    try {
      await api.finishVisit(appointment.id, { diagnosis: diagnosis.trim(), internal_note: note.trim(), medicines });
      toast.success(t("doctor.finished"));
      onDone();
    } catch (err) {
      toast.error(errorText(err, t));
      setSaving(false);
    }
  }

  return (
    <Card className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">{appointment.patient_name}</h2>
        <StatusBadge status={appointment.status} />
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-medium">{t("doctor.history")}</h3>
        <History patientId={appointment.patient_id} />
      </div>

      <Field label={t("visit.diagnosis")}>
        <Textarea value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} />
      </Field>
      <Field label={t("doctor.internalNote")}>
        <Textarea value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>

      <div className="space-y-3">
        <h3 className="text-sm font-medium">{t("visit.prescription")}</h3>
        <MedicineList medicines={medicines} />
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label={t("doctor.medicine")}>
            <Input dir="ltr" value={medicine.name} onChange={(e) => setMedicine({ ...medicine, name: e.target.value })} />
          </Field>
          <Field label={t("doctor.dose")}>
            <Input dir="ltr" value={medicine.dose} onChange={(e) => setMedicine({ ...medicine, dose: e.target.value })} />
          </Field>
          <Field label={t("doctor.days")}>
            <Input type="number" min={1} value={medicine.days} onChange={(e) => setMedicine({ ...medicine, days: Number(e.target.value) })} />
          </Field>
        </div>
        <Button variant="secondary" disabled={!medicine.name.trim()} onClick={addMedicine}>
          {t("doctor.addMedicine")}
        </Button>
      </div>

      <Button className="h-11 w-full" disabled={!diagnosis.trim()} loading={saving} onClick={finish}>
        {t("doctor.finish")}
      </Button>
    </Card>
  );
}

export default function DoctorPage() {
  const { t } = useT();
  const { session } = useSession();
  const doctorId = session?.user.doctor_id ?? 0;
  const { state, reload } = useLoad(() => api.doctorQueue(doctorId), String(doctorId), { every: 4000 });

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
              <VisitForm key={current.id} appointment={current} onDone={reload} />
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
