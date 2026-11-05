"use client";

import { useState } from "react";
import { CalendarDays } from "lucide-react";
import { api, type Doctor, type StaffAppointment } from "@/lib/api";
import { doctorName, longDate } from "@/lib/display";
import { errorText, useT } from "@/lib/i18n";
import { useLoad } from "@/lib/useLoad";
import { localToday } from "@/lib/validation";
import { Card, ErrorState, Field, Select } from "@/components/common";
import { CardsSkeleton } from "@/components/skeleton";

// How far ahead the list looks.
const DAYS = 14;

// The bookings for the coming days, grouped under each date.
// Reception sees every doctor and can pick one; a doctor (doctors given) sees only their own.
// includeToday also shows today's bookings whose patient hasn't arrived yet (the doctor has no other place to see
// them; reception already has them in "today's bookings").
export function UpcomingBookings({ doctors, doctorId, includeToday }: { doctors?: Doctor[]; doctorId?: number; includeToday?: boolean }) {
  const { t, locale } = useT();
  const [picked, setPicked] = useState("");
  const forDoctor = doctorId ?? (picked ? Number(picked) : undefined);
  const { state, reload } = useLoad(
    () => api.upcomingAppointments({ days: DAYS, doctor_id: forDoctor, include_today: includeToday }),
    `${forDoctor ?? "all"}|${includeToday ? 1 : 0}`,
    {
      every: 30_000,
      keepPrevious: true,
    },
  );
  const today = localToday();

  // One group per date, in order. The server already sorts by date and time.
  const groups: { date: string; list: StaffAppointment[] }[] = [];
  if (state.status === "success") {
    for (const a of state.data) {
      const last = groups[groups.length - 1];
      if (last?.date === a.date) last.list.push(a);
      else groups.push({ date: a.date, list: [a] });
    }
  }
  const nameOf = (id: number) => {
    const d = doctors?.find((x) => x.id === id);
    return d ? doctorName(d, locale) : "";
  };

  return (
    <Card className="space-y-3" data-upcoming>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-semibold">
          <CalendarDays className="size-4 text-brand-600" aria-hidden />
          {t("upcoming.title")}
        </h2>
        <span className="text-xs text-slate-500">{t("upcoming.range", { n: DAYS })}</span>
      </div>
      {doctors && doctorId === undefined && doctors.length > 1 && (
        <div className="max-w-xs">
          <Field label={t("upcoming.doctor")}>
            <Select value={picked} onChange={(e) => setPicked(e.target.value)}>
              <option value="">{t("upcoming.allDoctors")}</option>
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>
                  {doctorName(d, locale)}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      )}
      {state.status === "loading" && <CardsSkeleton count={1} />}
      {state.status === "error" && <ErrorState message={errorText(state.error, t)} onRetry={reload} />}
      {state.status === "success" && groups.length === 0 && <p className="text-sm text-slate-500">{t("upcoming.empty", { n: DAYS })}</p>}
      {groups.map((g) => (
        <section key={g.date} className="space-y-1.5" data-upcoming-day={g.date}>
          <h3 className="flex items-baseline justify-between gap-2 border-t border-slate-200 pt-2 text-sm font-semibold">
            {g.date === today ? (
              <span className="text-amber-700">{t("upcoming.todayNotArrived")}</span>
            ) : (
              <span>{longDate(g.date, locale)}</span>
            )}
            <span className="shrink-0 text-xs font-normal whitespace-nowrap text-slate-500">{t("upcoming.count", { n: g.list.length })}</span>
          </h3>
          <ul className="space-y-1">
            {g.list.map((a) => (
              <li key={a.id} className="flex flex-wrap items-baseline gap-x-2 text-sm">
                <span dir="ltr" className="w-12 font-mono font-semibold text-brand-700">
                  {a.time}
                </span>
                <span className="font-medium">{a.patient_name}</span>
                {doctorId === undefined && nameOf(a.doctor_id) && <span className="text-slate-600">· {nameOf(a.doctor_id)}</span>}
                <span className="text-xs text-slate-500">· {t(`kind.${a.kind}`)}</span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </Card>
  );
}
