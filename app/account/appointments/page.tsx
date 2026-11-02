"use client";

import Link from "next/link";
import { toast } from "sonner";
import { api, type MyAppointment } from "@/lib/api";
import { doctorName } from "@/lib/display";
import { errorText, useT } from "@/lib/i18n";
import { useLoad } from "@/lib/useLoad";
import { Button, Card, EmptyState, ErrorState, PageHeader, StatusBadge, buttonClass } from "@/components/common";
import { CardsSkeleton } from "@/components/skeleton";

function TurnText({ appointment }: { appointment: MyAppointment }) {
  const { t } = useT();
  if (appointment.status === "in_progress") return <>{t("appointments.withDoctor")}</>;
  if (appointment.ahead === 0) return <>{t("appointments.yourTurn")}</>;
  return <>{t("appointments.ahead", { n: appointment.ahead ?? 0 })}</>;
}

export default function AppointmentsPage() {
  const { t, locale } = useT();
  const { state, reload } = useLoad(api.myAppointments, "", { every: 4000 });

  async function cancel(id: number) {
    try {
      await api.cancelAppointment(id);
      toast.success(t("appointments.cancelled"));
      reload();
    } catch (err) {
      toast.error(errorText(err, t));
    }
  }

  return (
    <>
      <PageHeader title={t("appointments.title")} description={t("appointments.subtitle")} />
      {state.status === "loading" && <CardsSkeleton count={2} />}
      {state.status === "error" && <ErrorState message={errorText(state.error, t)} onRetry={reload} />}
      {state.status === "success" && state.data.length === 0 && (
        <div className="space-y-4 text-center">
          <EmptyState title={t("appointments.empty")} description={t("appointments.emptyHint")} />
          <Link href="/account" replace className={buttonClass("primary", "h-11 px-5", "default")}>
            {t("appointments.bookNow")}
          </Link>
        </div>
      )}
      {state.status === "success" && (
        <div className="space-y-3">
          {state.data.map((a) => (
            <Card key={a.id} className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-semibold">{doctorName(a.doctor, locale)}</h2>
                <StatusBadge status={a.status} />
              </div>
              <p className="text-sm text-slate-600">
                {a.patient_name} · {t(`day.${a.day}`)} · <span dir="ltr">{a.time}</span>
              </p>
              {a.ahead !== null && (
                <p className="rounded-lg bg-brand-50 px-3 py-2 text-lg font-bold text-brand-700">
                  <TurnText appointment={a} />
                </p>
              )}
              {a.status === "booked" && (
                <Button variant="danger" onClick={() => cancel(a.id)}>
                  {t("appointments.cancel")}
                </Button>
              )}
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
