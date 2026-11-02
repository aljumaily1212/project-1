"use client";

import { Toaster as Sonner } from "sonner";
import { useLocale } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";

export function Toaster() {
  const locale = useLocale();
  const theme = useTheme();
  const rtl = locale === "ar";
  return <Sonner theme={theme} richColors closeButton dir={rtl ? "rtl" : "ltr"} position={rtl ? "bottom-left" : "bottom-right"} />;
}
