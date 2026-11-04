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
  const counts = [
    { key: "stock.alert.out", n: items.filter((i) => i.level === "out").length },
    { key: "stock.alert.low", n: items.filter((i) => i.level === "low").length },
    { key: "stock.alert.expired", n: items.filter((i) => i.expiry === "expired").length },
    { key: "stock.alert.soon", n: items.filter((i) => i.expiry === "soon").length },
  ] as const;
  const shown = counts.filter((c) => c.n > 0);
  if (shown.length === 0) return null;

  return (
    <div role="status" data-stock-alerts className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900">
      <span className="flex items-center gap-2 font-semibold">
        <TriangleAlert className="size-4" aria-hidden />
        {t("stock.alert.title")}
      </span>
      {shown.map((c) => (
        <span key={c.key}>{t(c.key, { n: c.n })}</span>
      ))}
      {linkToStock && (
        <Link href="/pharmacy/stock" replace className="ms-auto font-medium underline">
          {t("stock.alert.open")}
        </Link>
      )}
    </div>
  );
}
