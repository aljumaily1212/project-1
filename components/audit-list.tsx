"use client";

import type { AuditEntry } from "@/lib/api";
import { dateTime } from "@/lib/display";
import { useT, type MessageKey } from "@/lib/i18n";
import { ROLE_LABEL } from "@/components/staff-users";

export function AuditList({ entries }: { entries: AuditEntry[] }) {
  const { t, locale } = useT();
  return (
    <ul className="divide-y divide-slate-200">
      {entries.map((entry) => (
        <li key={entry.id} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-3 text-sm">
          <p>
            <span className="font-medium">{entry.user_name}</span>{" "}
            <span className="text-slate-500">({entry.role === "patient" ? t("nav.patient") : t(ROLE_LABEL[entry.role])})</span>{" "}
            {t(`audit.${entry.action}` as MessageKey)} <span className="font-medium">{entry.target}</span>
          </p>
          <time className="text-xs text-slate-500" dateTime={entry.at}>
            {dateTime(entry.at, locale)}
          </time>
        </li>
      ))}
    </ul>
  );
}
