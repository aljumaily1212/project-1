"use client";

import { useState } from "react";
import { useT } from "@/lib/i18n";
import { PageHeader } from "@/components/common";
import { DuesView, MonthPicker, thisMonth } from "@/components/finance";

export default function DuesPage() {
  const { t } = useT();
  const [month, setMonth] = useState(thisMonth);
  return (
    <>
      <PageHeader title={t("dues.title")} description={t("dues.subtitle")} />
      <MonthPicker value={month} onChange={setMonth} />
      <DuesView month={month} />
    </>
  );
}
