"use client";

import { useState } from "react";
import { toast } from "sonner";
import { api, type FamilyMember, type MyVisit, type PatientVisit, type TestResult, type VisitRating } from "@/lib/api";
import { useSession } from "@/lib/auth";
import { dateTime, doctorName } from "@/lib/display";
import { errorText, useT } from "@/lib/i18n";
import { useLoad } from "@/lib/useLoad";
import { Button, Card, EmptyState, ErrorState, MedicineList, PageHeader, Textarea } from "@/components/common";
import { StarPicker, Stars } from "@/components/stars";
import { ResultView, serviceName } from "@/components/result-view";
import { PrintButton, PrintSection } from "@/components/print";
import { AlertsBanner, hasAlerts } from "@/components/medical-alerts";
import { CardsSkeleton } from "@/components/skeleton";

// Allergies, diseases and blood type for each person on the account. Written by the doctor; read-only here.
function FamilyAlerts({ family }: { family: FamilyMember[] }) {
  const { t } = useT();
  const withAlerts = family.filter((m) => hasAlerts(m.alerts));
  if (withAlerts.length === 0) return <p className="text-sm text-slate-500">{t("alerts.none")}</p>;
  return (
    <div className="space-y-3">
      {withAlerts.map((m) => (
        <div key={m.id} className="space-y-1">
          <p className="text-sm font-semibold">{m.name}</p>
          <AlertsBanner alerts={m.alerts} />
        </div>
      ))}
    </div>
  );
}

// The whole file on paper: alerts, every visit with its prescription, then every confirmed test result.
function PrintedFile({ visits, results, family }: { visits: PatientVisit[]; results: TestResult[]; family: FamilyMember[] }) {
  const { t, locale } = useT();
  return (
    <>
      <PrintSection title={t("alerts.title")}>
        <FamilyAlerts family={family} />
      </PrintSection>
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

// Under each visit: the patient's rating once given, otherwise a small form to give one.
function VisitRatingBox({ visit, onRated }: { visit: MyVisit; onRated: (rating: VisitRating) => void }) {
  const { t } = useT();
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);

  if (visit.rating) {
    return (
      <div className="space-y-1 border-t border-slate-200 pt-2 text-sm" data-rated>
        <p className="flex items-center gap-2 text-slate-600">
          {t("rating.yours")} <Stars value={visit.rating.stars} />
        </p>
        {visit.rating.comment && <p className="text-slate-600">“{visit.rating.comment}”</p>}
      </div>
    );
  }

  async function send() {
    setSaving(true);
    try {
      const saved = await api.rateVisit(visit.id, { stars, comment });
      toast.success(t("rating.thanks"));
      onRated(saved);
    } catch (err) {
      toast.error(errorText(err, t));
      setSaving(false);
    }
  }

  return (
    <div className="space-y-2 border-t border-slate-200 pt-3" data-rate-form>
      <p className="text-sm font-medium">{t("rating.ask")}</p>
      <StarPicker value={stars} onChange={setStars} />
      {stars > 0 && (
        <>
          <Textarea value={comment} maxLength={300} placeholder={t("rating.commentPlaceholder")} onChange={(e) => setComment(e.target.value)} />
          <Button loading={saving} onClick={send}>
            {t("rating.send")}
          </Button>
        </>
      )}
    </div>
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
  const { state, reload, setData } = useLoad(api.myVisits);
  // Loaded here too, so the printed file can include the results.
  const results = useLoad(api.myResults);
  const family = useLoad(api.myFamily);
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
              {() => (
                <PrintedFile
                  visits={state.status === "success" ? state.data : []}
                  results={results.state.status === "success" ? results.state.data : []}
                  family={family.state.status === "success" ? family.state.data : []}
                />
              )}
            </PrintButton>
          )
        }
      />
      <div className="space-y-8">
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">{t("alerts.title")}</h2>
          {family.state.status === "loading" && <CardsSkeleton count={1} />}
          {family.state.status === "error" && <ErrorState message={errorText(family.state.error, t)} onRetry={family.reload} />}
          {family.state.status === "success" && (
            <Card>
              <FamilyAlerts family={family.state.data} />
            </Card>
          )}
        </section>
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
                <VisitRatingBox visit={v} onRated={(rating) => setData((list) => list.map((x) => (x.id === v.id ? { ...x, rating } : x)))} />
              </Card>
            ))}
        </section>
        <Results />
      </div>
    </>
  );
}
