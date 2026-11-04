"use client";

import { useState } from "react";
import { api, type AuditAction, type AuditEntry } from "@/lib/api";
import { dateTime } from "@/lib/display";
import { sheet } from "@/lib/excel";
import { errorText, useT, type MessageKey } from "@/lib/i18n";
import { useLoad } from "@/lib/useLoad";
import { AuditList } from "@/components/audit-list";
import { Card, EmptyState, ErrorState, Field, PageHeader, Select } from "@/components/common";
import { CardsSkeleton } from "@/components/skeleton";
import { ExportButton } from "@/components/export-button";
import { ROLE_LABEL } from "@/components/staff-users";

const ACTIONS: AuditAction[] = [
  "file.open",
  "visit.finish",
  "prescription.dispense",
  "appointment.book",
  "appointment.cancel",
  "appointment.reschedule",
  "appointment.checkin",
  "walkin.add",
  "lab.result",
  "lab.confirm",
  "lab.edit",
  "payment.cash",
  "payment.online",
  "payment.refund",
  "appointment.no_show",
  "service.create",
  "service.update",
  "payment.reverse",
  "account.delete",
  "doctor.update",
  "doctor.absent",
  "doctor.late",
  "staff.create",
  "settings.update",
];

export default function AuditPage() {
  const { t, locale } = useT();
  const { state, reload } = useLoad(api.listAudit, "", { every: 10000 });
  const [action, setAction] = useState("");

  const entries = state.status === "success" ? state.data.filter((e) => !action || e.action === action) : [];

  return (
    <>
      <PageHeader
        title={t("audit.title")}
        description={t("audit.subtitle")}
        action={
          <ExportButton
            fileName={`audit-${new Date().toISOString().slice(0, 10)}`}
            disabled={entries.length === 0}
            // Exports what the filter shows.
            sheets={() => [
              sheet(t("audit.title"), [
                { header: t("export.date"), value: (e: AuditEntry) => dateTime(e.at, locale), width: 22 },
                { header: t("export.by"), value: (e: AuditEntry) => e.user_name, width: 18 },
                { header: t("export.role"), value: (e: AuditEntry) => (e.role === "patient" ? t("nav.patient") : t(ROLE_LABEL[e.role])), width: 14 },
                { header: t("export.action"), value: (e: AuditEntry) => t(`audit.${e.action}` as MessageKey), width: 34 },
                { header: t("export.target"), value: (e: AuditEntry) => e.target, width: 26 },
              ], entries),
            ]}
          />
        }
      />
      <Card className="space-y-4">
        <div className="max-w-xs">
          <Field label={t("audit.all")}>
            <Select value={action} onChange={(e) => setAction(e.target.value)}>
              <option value="">{t("audit.all")}</option>
              {ACTIONS.map((a) => (
                <option key={a} value={a}>
                  {t(`audit.${a}` as MessageKey)}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        {state.status === "loading" && <CardsSkeleton count={2} />}
        {state.status === "error" && <ErrorState message={errorText(state.error, t)} onRetry={reload} />}
        {state.status === "success" && entries.length === 0 && <EmptyState title={t("audit.empty")} />}
        {state.status === "success" && <AuditList entries={entries} />}
      </Card>
    </>
  );
}
