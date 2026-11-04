"use client";

import { api, type PatientVisit, type TestResult } from "@/lib/api";
import { useSession } from "@/lib/auth";
import { dateTime, doctorName } from "@/lib/display";
import { errorText, useT } from "@/lib/i18n";
import { useLoad } from "@/lib/useLoad";
import { Card, EmptyState, ErrorState, MedicineList, PageHeader } from "@/components/common";
import { ResultView, serviceName } from "@/components/result-view";
import { PrintButton, PrintSection } from "@/components/print";
import { CardsSkeleton } from "@/components/skeleton";

// The whole file on paper: every visit with its prescription, then every confirmed test result.
function PrintedFile({ visits, results }: { visits: PatientVisit[]; results: TestResult[] }) {
  const { t, locale } = useT();
  return (
    <>
      <PrintSection title={t("records.visits")}>
        {visits.length === 0 && <p>{t("records.empty")}</p>}
        {visits.map((v) => (
          <div key={v.id} className="print-keep space-y-1 border-b border-[#e2e8f0] pb-2">
            <p className="font-semibold">
              {dateTime(v.created_at, locale)} · {v.patient_name} · {doctorName(v.doctor, locale)}
            </p>
            <p>
              {t("visit.diagnosis")}: {v.diagnosis}
            </p>
            {v.medicines.length > 0 ? <MedicineList medicines={v.medicines} /> : <p>{t("visit.noMedicines")}</p>}
          </div>
        ))}
      </PrintSection>
      <PrintSection title={t("records.results")}>
        {results.length === 0 && <p>{t("records.noResults")}</p>}
        {results.map((r) => (
          <div key={r.id} className="print-keep space-y-1">
            <p className="font-semibold">
              {serviceName(r.test, locale)} · {r.patient_name} · {dateTime(r.confirmed_at, locale)}
            </p>
            <ResultView result={r.result} />
          </div>
        ))}
      </PrintSection>
    </>
  );
}

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
  // Loaded here too, so the printed file can include the results.
  const results = useLoad(api.myResults);
  const { session } = useSession();
  const ready = state.status === "success" && results.state.status === "success";

  return (
    <>
      <PageHeader
        title={t("records.title")}
        description={t("records.subtitle")}
        action={
          ready && (
            <PrintButton title={t("print.medicalFile")} subject={session?.user.name ?? ""}>
              {() => <PrintedFile visits={state.status === "success" ? state.data : []} results={results.state.status === "success" ? results.state.data : []} />}
            </PrintButton>
          )
        }
      />
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
