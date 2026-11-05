"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { errorText, useT } from "@/lib/i18n";
import { usePaged } from "@/lib/paging";
import { useLoad } from "@/lib/useLoad";
import { Card, EmptyState, ErrorState, Field, PageHeader, Select, ShowMore } from "@/components/common";
import { PaymentLog } from "@/components/payment-log";
import { CardsSkeleton } from "@/components/skeleton";

// "مدفوعاتي": everything paid, given back, or tried online, for the patient and their family.
export default function MyPaymentsPage() {
  const { t } = useT();
  const family = useLoad(api.myFamily);
  const [person, setPerson] = useState("");
  const log = usePaged((q) => api.myPayments({ ...q, patient_id: person ? Number(person) : undefined }), person, { pageSize: 20, every: 15000 });
  const people = family.state.status === "success" ? family.state.data : [];

  return (
    <>
      <PageHeader title={t("paylog.title")} description={t("paylog.subtitle")} />
      <div className="max-w-2xl space-y-4">
        {people.length > 1 && (
          <div className="max-w-xs">
            <Field label={t("paylog.for")}>
              <Select value={person} onChange={(e) => setPerson(e.target.value)}>
                <option value="">{t("paylog.everyone")}</option>
                {people.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        )}
        {log.state.status === "loading" && <CardsSkeleton count={2} />}
        {log.state.status === "error" && <ErrorState message={errorText(log.state.error, t)} onRetry={log.reload} />}
        {log.state.status === "success" &&
          (log.items.length === 0 ? (
            <EmptyState title={t("paylog.empty")} />
          ) : (
            <Card className="space-y-3 p-0 pb-3">
              <PaymentLog entries={log.items} showPatient={people.length > 1 && !person} />
              <div className="px-4">
                <ShowMore shown={log.items.length} total={log.total} loading={log.loadingMore} onMore={log.more} />
              </div>
            </Card>
          ))}
      </div>
    </>
  );
}
