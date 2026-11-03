"use client";

import { useState } from "react";
import { useT } from "@/lib/i18n";
import { PageHeader } from "@/components/common";
import { DuesView, LedgerView, MonthPicker, ReportView, thisMonth } from "@/components/finance";

// The manager sees everything the accountant sees, but cannot reverse payments.
export default function ManagerReportsPage() {
  const { t } = useT();
  const [month, setMonth] = useState(thisMonth);
  return (
    <>
      <PageHeader title={t("reports.title")} description={t("reports.subtitle")} />
      <MonthPicker value={month} onChange={setMonth} />
      <div className="space-y-8">
        <ReportView month={month} />
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">{t("dues.title")}</h2>
          <DuesView month={month} />
        </section>
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">{t("ledger.title")}</h2>
          <LedgerView canReverse={false} />
        </section>
      </div>
    </>
  );
}
