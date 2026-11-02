"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import { ApiError, NETWORK_ERROR } from "../api/errors";
import { DEFAULT_LOCALE as BOOT_LOCALE, LOCALE_KEY } from "../boot";
import { ar } from "./ar";
import { en, type MessageKey } from "./en";

export type Locale = "ar" | "en";
export type { MessageKey };

export const DEFAULT_LOCALE: Locale = BOOT_LOCALE;

const dictionaries: Record<Locale, Record<MessageKey, string>> = { ar, en };

const listeners = new Set<() => void>();

function readLocale(): Locale {
  try {
    const v = localStorage.getItem(LOCALE_KEY);
    return v === "en" || v === "ar" ? v : DEFAULT_LOCALE;
  } catch {
    return DEFAULT_LOCALE;
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setLocale(locale: Locale) {
  try {
    localStorage.setItem(LOCALE_KEY, locale);
  } catch {
  }
  document.documentElement.lang = locale;
  document.documentElement.dir = locale === "ar" ? "rtl" : "ltr";
  listeners.forEach((l) => l());
}

export function useLocale(): Locale {
  return useSyncExternalStore(subscribe, readLocale, () => DEFAULT_LOCALE);
}

export function LocaleSync() {
  const locale = useLocale();
  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === "ar" ? "rtl" : "ltr";
  }, [locale]);
  return null;
}

export type TFunction = (key: MessageKey, vars?: Record<string, string | number>) => string;

export function useT() {
  const locale = useLocale();
  const t: TFunction = useCallback(
    (key, vars) => {
      let text = dictionaries[locale][key] ?? key;
      if (vars) for (const [k, v] of Object.entries(vars)) text = text.replaceAll(`{${k}}`, String(v));
      return text;
    },
    [locale],
  );
  return { t, locale };
}

export function errorText(err: unknown, t: TFunction): string {
  if (err instanceof ApiError) {
    if (err.status === NETWORK_ERROR) return t("error.network");
    if (err.status === 429 && err.retryAfter) return t("error.429", { s: err.retryAfter });
    const coded = `apiError.${err.code}` as MessageKey;
    if (err.code && coded in en) return t(coded);
    if (err.message) return err.message;
    const key = `error.${err.status}` as MessageKey;
    return key in en ? t(key) : t("error.generic");
  }
  return t("error.generic");
}
