"use client";

import type { Amounts, Currency } from "@/lib/api";
import { money } from "@/lib/display";
import { useT } from "@/lib/i18n";

export function amountText(amount: number, currency: Currency, t: (key: "common.currency" | "common.usd") => string) {
  return `${money(amount)} ${currency === "USD" ? t("common.usd") : t("common.currency")}`;
}

// "25,000 IQD + 20 USD". Only currencies with an amount are shown; zero shows in dinars.
export function AmountsText({ amounts }: { amounts: Amounts }) {
  const { t } = useT();
  const parts = (["IQD", "USD"] as const).filter((c) => amounts[c] !== 0).map((c) => amountText(amounts[c], c, t));
  return <span dir="auto">{parts.length ? parts.join(" + ") : amountText(0, "IQD", t)}</span>;
}

// Shows a dollar amount with its value in dinars at the clinic's rate.
export function UsdHint({ usd, rate }: { usd: number; rate: number }) {
  const { t } = useT();
  if (!usd) return null;
  return <span className="text-xs text-slate-500">≈ {amountText(Math.round(usd * rate), "IQD", t)}</span>;
}
