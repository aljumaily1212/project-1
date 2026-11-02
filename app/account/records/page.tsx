"use client";

import { api } from "@/lib/api";
import { doctorName } from "@/lib/display";
import { errorText, useT } from "@/lib/i18n";
import { useLoad } from "@/lib/useLoad";
import { Card, EmptyState, ErrorState, MedicineList, PageHeader } from "@/components/common";
import { CardsSkeleton } from "@/components/skeleton";

export default function RecordsPage() {
  const { t, locale } = useT();
  const { state, reload } = useLoad(api.myVisits);

  return (
    <>
      <PageHeader title={t("records.title")} description={t("records.subtitle")} />
      {state.status === "loading" && <CardsSkeleton count={2} />}
      {state.status === "error" && <ErrorState message={errorText(state.error, t)} onRetry={reload} />}
      {state.status === "success" && state.data.length === 0 && (
        <EmptyState title={t("records.empty")} description={t("records.emptyHint")} />
      )}
      {state.status === "success" && (
        <div className="space-y-3">
          {state.data.map((v) => (
            <Card key={v.id} className="space-y-2">
              <h2 className="font-semibold">
                {v.patient_name} · {doctorName(v.doctor, locale)}
              </h2>
              <p className="text-sm">
                <span className="text-slate-500">{t("visit.diagnosis")}: </span>
                {v.diagnosis}
              </p>
              <h3 className="text-sm font-medium">{t("visit.prescription")}</h3>
              {v.medicines.length === 0 ? (
                <p className="text-sm text-slate-500">{t("visit.noMedicines")}</p>
              ) : (
                <MedicineList medicines={v.medicines} />
              )}
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
