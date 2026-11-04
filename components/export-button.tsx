"use client";

import { useState } from "react";
import { toast } from "sonner";
import { FileSpreadsheet } from "lucide-react";
import { downloadExcel, type ExcelSheet } from "@/lib/excel";
import { useT } from "@/lib/i18n";
import { Button } from "@/components/common";

// "تصدير Excel": builds the sheets only when pressed. `sheets` can also fetch first, for lists shown in parts.
export function ExportButton({
  fileName,
  sheets,
  disabled,
}: {
  fileName: string;
  sheets: () => ExcelSheet[] | Promise<ExcelSheet[]>;
  disabled?: boolean;
}) {
  const { t, locale } = useT();
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    try {
      await downloadExcel(fileName, await sheets(), locale === "ar");
    } catch {
      toast.error(t("export.failed"));
    }
    setBusy(false);
  }

  return (
    <Button type="button" variant="secondary" loading={busy} disabled={disabled} onClick={run} data-export>
      <FileSpreadsheet className="size-4" aria-hidden />
      {t("export.button")}
    </Button>
  );
}
