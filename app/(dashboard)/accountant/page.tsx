"use client";

import { useT } from "@/lib/i18n";
import { PageHeader } from "@/components/common";
import { LedgerView } from "@/components/finance";

export default function LedgerPage() {
  const { t } = useT();
  return (
    <>
      <PageHeader title={t("ledger.title")} description={t("ledger.subtitle")} />
      <LedgerView canReverse />
    </>
  );
}
