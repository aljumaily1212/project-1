"use client";

import { useState } from "react";
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";
import { api, type Analytics, type AnalyticsDay } from "@/lib/api";
import { money, shortDate } from "@/lib/display";
import { errorText, useT } from "@/lib/i18n";
import { useLoad } from "@/lib/useLoad";
import { Button, Card, ErrorState } from "@/components/common";
import { AmountsText } from "@/components/money";
import { CardsSkeleton } from "@/components/skeleton";
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";

// 7 days, or 4 whole weeks so every weekly group on the charts has 7 days.
const RANGES = [7, 28] as const;

// One bar group on a chart: a day, or a week when the range is long. a and b are its two bars.
type Group = { key: string; tick: string; label: string; a: number; b: number };

// Teal and blue, checked for colorblind readers in both day and night mode.
const SERIES_COLORS = {
  a: { light: "#1baf7a", dark: "#199e70" },
  b: { light: "#2a78d6", dark: "#3987e5" },
};

// 7 days show one group per day. Longer ranges add up whole weeks, ending today, so the chart stays readable.
function toGroups(days: AnalyticsDay[], pick: (d: AnalyticsDay) => [number, number]): Group[] {
  const size = days.length <= 7 ? 1 : 7;
  const groups: Group[] = [];
  for (let end = days.length; end > 0; end -= size) {
    const chunk = days.slice(Math.max(0, end - size), end);
    const first = shortDate(chunk[0].date);
    const last = shortDate(chunk[chunk.length - 1].date);
    const [a, b] = chunk.reduce(([x, y], d) => [x + pick(d)[0], y + pick(d)[1]], [0, 0]);
    // The axis shows the week's first day. The tooltip and the table show the whole week.
    groups.unshift({ key: chunk[0].date, tick: first, label: size === 1 ? first : `${first} – ${last}`, a, b });
  }
  return groups;
}

// Two bars side by side for every group, with a legend, a tooltip on hover and a table view.
function GroupedBars({ title, groups, names, format }: { title: string; groups: Group[]; names: [string, string]; format: (n: number) => string }) {
  const { t } = useT();
  const config = {
    a: { label: names[0], theme: SERIES_COLORS.a },
    b: { label: names[1], theme: SERIES_COLORS.b },
  } satisfies ChartConfig;

  return (
    <Card className="space-y-3">
      <h3 className="font-semibold">{title}</h3>
      {/* Time runs left to right in both languages. */}
      <ChartContainer config={config} className="h-60 w-full" dir="ltr">
        <BarChart data={groups} accessibilityLayer barGap={4}>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="tick" tickLine={false} axisLine={false} tickMargin={10} interval={0} />
          <ChartTooltip
            cursor={false}
            content={
              <ChartTooltipContent
                labelFormatter={(_, payload) => payload[0]?.payload.label}
                formatter={(value, name) => (
                  <div className="flex w-full items-center justify-between gap-4">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <span className="size-2.5 rounded-[2px]" style={{ background: `var(--color-${name})` }} />
                      {config[name as "a" | "b"].label}
                    </span>
                    <span className="font-mono font-medium tabular-nums">{format(Number(value))}</span>
                  </div>
                )}
              />
            }
          />
          <ChartLegend content={<ChartLegendContent />} />
          <Bar dataKey="a" fill="var(--color-a)" radius={6} />
          <Bar dataKey="b" fill="var(--color-b)" radius={6} />
        </BarChart>
      </ChartContainer>
      <details className="text-sm">
        <summary className="cursor-pointer text-slate-500">{t("analytics.asTable")}</summary>
        <table className="mt-2 w-full text-start">
          <thead>
            <tr className="text-slate-500">
              <th className="py-1 text-start font-normal" />
              <th className="py-1 text-end font-normal">{names[0]}</th>
              <th className="py-1 text-end font-normal">{names[1]}</th>
            </tr>
          </thead>
          <tbody>
            {groups.map((g) => (
              <tr key={g.key} className="border-t border-slate-200">
                <td className="py-1">{g.label}</td>
                <td className="py-1 text-end" dir="ltr">
                  {format(g.a)}
                </td>
                <td className="py-1 text-end" dir="ltr">
                  {format(g.b)}
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
        <GroupedBars
          title={t("analytics.visitsPerDay")}
          names={[t("kind.new"), t("kind.followup")]}
          format={String}
          groups={toGroups(data.by_day, (d) => [d.visits - d.followups, d.followups])}
        />
        <GroupedBars
          title={t("analytics.moneyPerDay")}
          names={[t("payments.method.cash"), t("payments.method.online")]}
          format={iqd}
          groups={toGroups(data.by_day, (d) => [d.cash, d.online])}
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
  const [days, setDays] = useState<number>(28);
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
