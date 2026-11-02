"use client";

import { toast } from "sonner";
import { api, type Prescription } from "@/lib/api";
import { errorText, useT } from "@/lib/i18n";
import { useLoad } from "@/lib/useLoad";
import { Button, Card, EmptyState, ErrorState, MedicineList, PageHeader } from "@/components/common";
import { CardsSkeleton } from "@/components/skeleton";

function PrescriptionCard({ prescription, onDispense }: { prescription: Prescription; onDispense: (id: number) => void }) {
  const { t } = useT();
  return (
    <Card className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-semibold">{prescription.patient_name}</h3>
        {prescription.dispensed && (
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">{t("pharmacy.dispensed")}</span>
        )}
      </div>
      <MedicineList medicines={prescription.medicines} />
      {!prescription.dispensed && (
        <Button className="w-full" onClick={() => onDispense(prescription.id)}>
          {t("pharmacy.dispense")}
        </Button>
      )}
    </Card>
  );
}

export default function PharmacyPage() {
  const { t } = useT();
  const { state, reload } = useLoad(api.listPrescriptions, "", { every: 4000 });

  async function dispense(id: number) {
    try {
      await api.dispense(id);
      toast.success(t("pharmacy.done"));
      reload();
    } catch (err) {
      toast.error(errorText(err, t));
    }
  }

  const waiting = state.status === "success" ? state.data.filter((p) => !p.dispensed) : [];
  const dispensed = state.status === "success" ? state.data.filter((p) => p.dispensed) : [];

  return (
    <>
      <PageHeader title={t("pharmacy.title")} description={t("pharmacy.subtitle")} />
      {state.status === "loading" && <CardsSkeleton count={2} />}
      {state.status === "error" && <ErrorState message={errorText(state.error, t)} onRetry={reload} />}
      {state.status === "success" && (
        <div className="grid items-start gap-6 lg:grid-cols-2">
          <section className="space-y-3">
            <h2 className="font-semibold">{t("pharmacy.waiting")}</h2>
            {waiting.length === 0 && <EmptyState title={t("pharmacy.noWaiting")} />}
            {waiting.map((p) => (
              <PrescriptionCard key={p.id} prescription={p} onDispense={dispense} />
            ))}
          </section>
          <section className="space-y-3">
            <h2 className="font-semibold">{t("pharmacy.dispensed")}</h2>
            {dispensed.length === 0 && <EmptyState title={t("pharmacy.noDispensed")} />}
            {dispensed.map((p) => (
              <PrescriptionCard key={p.id} prescription={p} onDispense={dispense} />
            ))}
          </section>
        </div>
      )}
    </>
  );
}
