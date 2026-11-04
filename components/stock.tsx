"use client";

import Link from "next/link";
import { TriangleAlert } from "lucide-react";
import type { StockItem } from "@/lib/api";
import { fullDate } from "@/lib/display";
import { useT, type MessageKey } from "@/lib/i18n";

// "240 tablets": the number with its unit, translated.
export function unitText(quantity: number, unit: string, t: (key: MessageKey, vars?: Record<string, string | number>) => string) {
  return t(`stock.unit.${unit}` as MessageKey, { n: quantity });
}

const LEVEL_STYLE = {
  out: "bg-red-100 text-red-800",
  low: "bg-amber-100 text-amber-800",
} as const;

const EXPIRY_STYLE = {
  expired: "bg-red-100 text-red-800",
  soon: "bg-amber-100 text-amber-800",
} as const;

// Warning labels for one item. Nothing shows when it is fine.
export function StockBadges({ item }: { item: StockItem }) {
  const { t } = useT();
  return (
    <span className="flex flex-wrap gap-1.5">
      {item.level !== "ok" && (
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${LEVEL_STYLE[item.level]}`}>{t(`stock.level.${item.level}`)}</span>
      )}
      {(item.expiry === "soon" || item.expiry === "expired") && (
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${EXPIRY_STYLE[item.expiry]}`}>
          {t(`stock.expiry.${item.expiry}`, { date: item.expires_on ? fullDate(item.expires_on) : "" })}
        </span>
      )}
    </span>
  );
}

// Counts of everything that needs attention. Shows nothing when all is well.
export function StockAlerts({ items, linkToStock }: { items: StockItem[]; linkToStock?: boolean }) {
  const { t } = useT();
  // Red for what can't be given at all, amber for what needs attention soon. The same colors as the item labels.
  const counts = [
    { key: "stock.alert.out", n: items.filter((i) => i.level === "out").length, style: LEVEL_STYLE.out },
    { key: "stock.alert.expired", n: items.filter((i) => i.expiry === "expired").length, style: EXPIRY_STYLE.expired },
    { key: "stock.alert.low", n: items.filter((i) => i.level === "low").length, style: LEVEL_STYLE.low },
    { key: "stock.alert.soon", n: items.filter((i) => i.expiry === "soon").length, style: EXPIRY_STYLE.soon },
  ] as const;
  const shown = counts.filter((c) => c.n > 0);
  if (shown.length === 0) return null;

  return (
    // Only colors that have a night-mode version in globals.css (amber-50/100/700/800), so it stays readable in both modes.
    <div role="status" data-stock-alerts className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-amber-100 bg-amber-50 px-4 py-3 text-sm">
      <span className="me-1 flex items-center gap-2 font-semibold text-amber-800">
        <TriangleAlert className="size-4" aria-hidden />
        {t("stock.alert.title")}
      </span>
      {shown.map((c) => (
        <span key={c.key} className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${c.style}`}>
          {t(c.key, { n: c.n })}
        </span>
      ))}
      {linkToStock && (
        <Link href="/pharmacy/stock" replace className="ms-auto font-medium text-amber-800 underline">
          {t("stock.alert.open")}
        </Link>
      )}
    </div>
  );
}
