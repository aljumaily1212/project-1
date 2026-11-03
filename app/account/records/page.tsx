"use client";

import { api } from "@/lib/api";
import { dateTime, doctorName } from "@/lib/display";
import { errorText, useT } from "@/lib/i18n";
import { useLoad } from "@/lib/useLoad";
import { Card, EmptyState, ErrorState, MedicineList, PageHeader } from "@/components/common";
import { ResultView, serviceName } from "@/components/result-view";
import { CardsSkeleton } from "@/components/skeleton";

function Results() {
  const { t, locale } = useT();
  const { state, reload } = useLoad(api.myResults);

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">{t("records.results")}</h2>
      {state.status === "loading" && <CardsSkeleton count={1} />}
      {state.status === "error" && <ErrorState message={errorText(state.error, t)} onRetry={reload} />}
      {state.status === "success" && state.data.length === 0 && <EmptyState title={t("records.noResults")} />}
      {state.status === "success" &&
        state.data.map((r) => (
          <Card key={r.id} className="space-y-2">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="font-semibold">
                {serviceName(r.test, locale)} · {r.patient_name}
              </h3>
              <time className="text-xs text-slate-500">{dateTime(r.confirmed_at, locale)}</time>
            </div>
            <ResultView result={r.result} />
          </Card>
        ))}
    </section>
  );
}

export default function RecordsPage() {
  const { t, locale } = useT();
  const { state, reload } = useLoad(api.myVisits);

  return (
    <>
      <PageHeader title={t("records.title")} description={t("records.subtitle")} />
      <div className="space-y-8">
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">{t("records.visits")}</h2>
          {state.status === "loading" && <CardsSkeleton count={2} />}
          {state.status === "error" && <ErrorState message={errorText(state.error, t)} onRetry={reload} />}
          {state.status === "success" && state.data.length === 0 && (
            <EmptyState title={t("records.empty")} description={t("records.emptyHint")} />
          )}
          {state.status === "success" &&
            state.data.map((v) => (
              <Card key={v.id} className="space-y-2">
                <h3 className="font-semibold">
                  {v.patient_name} · {doctorName(v.doctor, locale)}
                </h3>
                <p className="text-sm">
                  <span className="text-slate-500">{t("visit.diagnosis")}: </span>
                  {v.diagnosis}
                </p>
                <h4 className="text-sm font-medium">{t("visit.prescription")}</h4>
                {v.medicines.length === 0 ? (
                  <p className="text-sm text-slate-500">{t("visit.noMedicines")}</p>
                ) : (
                  <MedicineList medicines={v.medicines} />
                )}
              </Card>
            ))}
        </section>
        <Results />
      </div>
    </>
  );
}
