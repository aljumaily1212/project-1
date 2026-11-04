"use client";

import { useEffect } from "react";
import { api, type AppNotification } from "@/lib/api";
import { dateTime, longDate } from "@/lib/display";
import { errorText, useT, type Locale, type TFunction } from "@/lib/i18n";
import { useLoad } from "@/lib/useLoad";
import { Card, EmptyState, ErrorState, PageHeader } from "@/components/common";
import { CardsSkeleton } from "@/components/skeleton";

// Turns a stored message into a sentence in the reader's language.
function messageText(n: AppNotification, t: TFunction, locale: Locale) {
  const p = n.params;
  const date = typeof p.date === "string" ? longDate(p.date, locale) : "";
  switch (n.type) {
    case "doctor_absent":
      return t("notifications.doctor_absent", { doctor: p.doctor, date, time: p.time });
    case "doctor_late":
      return t("notifications.doctor_late", { doctor: p.doctor, minutes: p.minutes });
    case "result_ready":
      return t("notifications.result_ready", { test: p.test });
    case "reminder":
      return t("notifications.reminder", { doctor: p.doctor, date, time: p.time });
    case "turn_near":
      return Number(p.n) === 0 ? t("notifications.turn_now", { doctor: p.doctor }) : t("notifications.turn_near", { doctor: p.doctor, n: p.n });
    case "booked":
      return t("notifications.booked", { doctor: p.doctor, date, time: p.time });
    default: {
      // A new message type without a sentence here fails the type check, instead of showing an empty message.
      const missing: never = n.type;
      return String(missing);
    }
  }
}

export default function NotificationsPage() {
  const { t, locale } = useT();
  const { state, reload } = useLoad(api.myNotifications, "", { every: 15000 });

  // Opening this page marks every message as read.
  useEffect(() => {
    void api.readNotifications();
  }, []);

  return (
    <>
      <PageHeader title={t("notifications.title")} description={t("notifications.subtitle")} />
      {state.status === "loading" && <CardsSkeleton count={2} />}
      {state.status === "error" && <ErrorState message={errorText(state.error, t)} onRetry={reload} />}
      {state.status === "success" && state.data.length === 0 && <EmptyState title={t("notifications.empty")} />}
      {state.status === "success" && (
        <div className="space-y-2">
          {state.data.map((n) => (
            <Card key={n.id} className={n.read ? "p-4" : "border-brand-300 bg-brand-50 p-4"}>
              <p className="text-sm">{messageText(n, t, locale)}</p>
              <time className="text-xs text-slate-500">{dateTime(n.at, locale)}</time>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
