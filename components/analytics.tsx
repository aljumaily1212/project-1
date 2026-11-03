"use client";

import { useState } from "react";
import { api, type Analytics } from "@/lib/api";
import { money, shortDate } from "@/lib/display";
import { errorText, useT } from "@/lib/i18n";
import { useLoad } from "@/lib/useLoad";
import { Button, Card, ErrorState } from "@/components/common";
import { AmountsText } from "@/components/money";
import { CardsSkeleton } from "@/components/skeleton";

const RANGES = [7, 30] as const;

type Column = { key: string; tick: string; value: number; tip: string };

// ---------- chart pieces ----------

// One bar per day. Hovering or focusing a bar shows its exact value. Time runs left to right in both languages.
function ColumnChart({ title, columns, format }: { title: string; columns: Column[]; format: (n: number) => string }) {
  const { t } = useT();
  const max = Math.max(1, ...columns.map((c) => c.value));
  // About six date labels under the chart, so they never overlap.
  const every = Math.max(1, Math.ceil(columns.length / 6));

  return (
    <Card className="space-y-3">
      <h3 className="font-semibold">{title}</h3>
      <div dir="ltr" className="flex gap-2">
        <div className="flex h-44 flex-col justify-between text-end text-xs text-slate-500">
          <span>{format(max)}</span>
          <span>0</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex h-44 items-end gap-0.5 border-b border-t border-dashed border-slate-200">
            {columns.map((c) => (
              <div key={c.key} tabIndex={0} aria-label={c.tip} className="group relative flex h-full flex-1 items-end outline-none">
                <div
                  className="w-full rounded-t-[4px] bg-brand-500 group-hover:bg-brand-700 group-focus:bg-brand-700"
                  style={{ height: `${(c.value / max) * 100}%`, minHeight: c.value > 0 ? 2 : 0 }}
                />
                <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-xs text-white shadow group-hover:block group-focus:block">
                  {c.tip}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-1 flex gap-0.5 text-xs text-slate-500">
            {columns.map((c, i) => (
              <span key={c.key} className="flex-1 overflow-visible whitespace-nowrap text-center">
                {i % every === 0 ? c.tick : ""}
              </span>
            ))}
          </div>
        </div>
      </div>
      <details className="text-sm">
        <summary className="cursor-pointer text-slate-500">{t("analytics.asTable")}</summary>
        <table className="mt-2 w-full text-start">
          <tbody>
            {columns.map((c) => (
              <tr key={c.key} className="border-t border-slate-200">
                <td className="py-1">{c.tick}</td>
                <td className="py-1 text-end" dir="ltr">
                  {format(c.value)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </Card>
  );
}

// A ranked list: each row has its name, its number and a bar for its size.
function BarList({ title, rows, format = String }: { title: string; rows: { label: string; value: number }[]; format?: (n: number) => string }) {
  const { t } = useT();
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <Card className="space-y-3">
      <h3 className="font-semibold">{title}</h3>
      {rows.length === 0 && <p className="text-sm text-slate-500">{t("analytics.noData")}</p>}
      <ul className="space-y-3">
        {rows.map((r) => (
          <li key={r.label} className="space-y-1 text-sm">
            <div className="flex justify-between gap-2">
              <span>{r.label}</span>
              <span className="font-semibold" dir="ltr">
                {format(r.value)}
              </span>
            </div>
            <div className="h-2 rounded-full bg-slate-100">
              <div className="h-2 rounded-full bg-brand-500" style={{ width: `${(r.value / max) * 100}%` }} />
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}

// One bar split into parts that add up to 100%, with a legend that names every part.
function ShareBar({ title, parts }: { title: string; parts: { label: string; value: number; color: string }[] }) {
  const { t } = useT();
  const total = parts.reduce((sum, p) => sum + p.value, 0);
  const percent = (n: number) => (total ? Math.round((n / total) * 100) : 0);
  return (
    <Card className="space-y-3">
      <h3 className="font-semibold">{title}</h3>
      {total === 0 ? (
        <p className="text-sm text-slate-500">{t("analytics.noData")}</p>
      ) : (
        <div className="flex h-3 gap-0.5 overflow-hidden rounded-full">
          {parts.map((p) => p.value > 0 && <div key={p.label} className={p.color} style={{ width: `${percent(p.value)}%` }} title={`${p.label}: ${percent(p.value)}%`} />)}
        </div>
      )}
      <ul className="space-y-1 text-sm">
        {parts.map((p) => (
          <li key={p.label} className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2">
              <span className={`size-2.5 rounded-full ${p.color}`} aria-hidden />
              {p.label}
            </span>
            <span className="text-slate-600" dir="ltr">
              {money(p.value)} · {percent(p.value)}%
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function Tile({ label, children, hint, small }: { label: string; children: React.ReactNode; hint?: string; small?: boolean }) {
  return (
    <Card className="p-4">
      <p className="text-sm text-slate-500">{label}</p>
      <p className={`mt-1 font-bold ${small ? "text-base" : "text-2xl"}`}>{children}</p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </Card>
  );
}

// ---------- the analytics section ----------

function Charts({ data }: { data: Analytics }) {
  const { t } = useT();
  const { totals } = data;
  const days = data.by_day.length;
  const iqd = (n: number) => `${money(n)} ${t("common.currency")}`;
  // Out of the appointments that were not cancelled, how many people didn't come.
  const expected = totals.appointments - totals.cancelled;
  const noShowRate = expected ? Math.round((totals.no_shows / expected) * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Tile label={t("analytics.visits")} hint={t("analytics.perDay", { n: (totals.visits / days).toFixed(1) })}>
          <span data-analytics="visits">{totals.visits}</span>
        </Tile>
        <Tile label={t("analytics.collected")} small>
          <AmountsText amounts={totals.collected} />
        </Tile>
        <Tile label={t("analytics.newPatients")}>{totals.new_patients}</Tile>
        <Tile label={t("analytics.noShowRate")} hint={t("analytics.noShowHint", { n: totals.no_shows })}>
          {noShowRate}%
        </Tile>
        <Tile label={t("analytics.walkIns")}>{totals.walk_ins}</Tile>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ColumnChart
          title={t("analytics.visitsPerDay")}
          format={String}
          columns={data.by_day.map((d) => ({
            key: d.date,
            tick: shortDate(d.date),
            value: d.visits,
            tip: `${shortDate(d.date)}: ${t("analytics.visitsTip", { n: d.visits })}`,
          }))}
        />
        <ColumnChart
          title={t("analytics.moneyPerDay")}
          format={(n) => money(n)}
          columns={data.by_day.map((d) => ({ key: d.date, tick: shortDate(d.date), value: d.collected, tip: `${shortDate(d.date)}: ${iqd(d.collected)}` }))}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <BarList title={t("analytics.byDoctor")} rows={data.by_doctor.map((d) => ({ label: d.label, value: d.visits }))} />
        <BarList title={t("analytics.moneyByDoctor")} rows={data.by_doctor.map((d) => ({ label: d.label, value: d.collected })).sort((a, b) => b.value - a.value)}
          format={money} />
        <BarList title={t("analytics.topDiagnoses")} rows={data.top_diagnoses.map((d) => ({ label: d.label, value: d.count }))} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <ShareBar
          title={t("analytics.outcomes")}
          parts={[
            { label: t("status.done"), value: totals.visits, color: "bg-brand-500" },
            { label: t("status.no_show"), value: totals.no_shows, color: "bg-amber-400" },
            { label: t("status.cancelled"), value: totals.cancelled, color: "bg-red-400" },
          ]}
        />
        <ShareBar
          title={t("analytics.payMethods")}
          parts={[
            { label: t("payments.method.cash"), value: data.by_method.cash, color: "bg-brand-700" },
            { label: t("payments.method.online"), value: data.by_method.online, color: "bg-brand-300" },
          ]}
        />
        <ShareBar
          title={t("analytics.visitKinds")}
          parts={[
            { label: t("kind.new"), value: totals.visits - totals.followups, color: "bg-brand-700" },
            { label: t("kind.followup"), value: totals.followups, color: "bg-brand-300" },
          ]}
        />
      </div>

      <BarList title={t("analytics.busyHours")} rows={data.by_hour.map((h) => ({ label: `${h.label}:00`, value: h.count }))} />
    </div>
  );
}

// The manager's numbers for the last 7 or 30 days.
export function AnalyticsSection() {
  const { t } = useT();
  const [days, setDays] = useState<number>(30);
  const { state, reload } = useLoad(() => api.analytics(days), String(days), { keepPrevious: true });

  return (
    <section className="mt-8 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-xl font-bold">{t("analytics.title")}</h2>
          {state.status === "success" && (
            <p className="text-sm text-slate-500">{t("analytics.range", { from: shortDate(state.data.from), to: shortDate(state.data.to) })}</p>
          )}
        </div>
        <div className="flex gap-2">
          {RANGES.map((n) => (
            <Button key={n} variant={n === days ? "primary" : "secondary"} onClick={() => setDays(n)}>
              {t(`analytics.last${n}`)}
            </Button>
          ))}
        </div>
      </div>
      {state.status === "loading" && <CardsSkeleton count={4} />}
      {state.status === "error" && <ErrorState message={errorText(state.error, t)} onRetry={reload} />}
      {state.status === "success" && <Charts data={state.data} />}
    </section>
  );
}
