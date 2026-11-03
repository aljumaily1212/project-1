"use client";

import type { LabResult, Service } from "@/lib/api";
import { money } from "@/lib/display";
import { useT } from "@/lib/i18n";

export function serviceName(service: Service, locale: "ar" | "en") {
  return locale === "ar" ? service.name_ar : service.name;
}

export function priceText(service: Service, t: (key: "common.currency" | "common.usd") => string) {
  return `${money(service.price)} ${service.currency === "USD" ? t("common.usd") : t("common.currency")}`;
}

// Shows a number with its unit, or a file: images show a preview, and every file can be downloaded.
export function ResultView({ result }: { result: LabResult }) {
  const { t } = useT();
  if (result.type === "number") {
    return (
      <p className="text-lg font-semibold" dir="ltr">
        {result.value} {result.unit}
      </p>
    );
  }
  return (
    <div className="space-y-2">
      {result.file_type.startsWith("image/") && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={result.data_url} alt={result.file_name} className="max-h-48 rounded-lg border border-slate-200" />
      )}
      <a href={result.data_url} download={result.file_name} className="inline-block text-sm font-medium text-brand-600 underline">
        {t("lab.download")}: {result.file_name}
      </a>
    </div>
  );
}
