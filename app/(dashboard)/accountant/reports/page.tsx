"use client";

import { useState } from "react";
import { useT } from "@/lib/i18n";
import { PageHeader } from "@/components/common";
import { MonthPicker, ReportView, thisMonth } from "@/components/finance";

export default function AccountantReportsPage() {
  const { t } = useT();
  const [month, setMonth] = useState(thisMonth);
  return (
    <>
      <PageHeader title={t("reports.title")} description={t("reports.subtitle")} />
      <MonthPicker value={month} onChange={setMonth} />
      <ReportView month={month} />
    </>
  );
}
