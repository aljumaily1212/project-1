import type { AppointmentStatus, Doctor } from "./api/types";
import type { Locale } from "./i18n";

export const doctorName = (d: Doctor, locale: Locale) => (locale === "ar" ? d.name_ar : d.name);
export const doctorSpecialty = (d: Doctor, locale: Locale) => (locale === "ar" ? d.specialty_ar : d.specialty);

export const money = (amount: number) => amount.toLocaleString("en-US");

// Latin digits in both languages, so numbers look the same everywhere.
const intl = (locale: Locale) => (locale === "ar" ? "ar-IQ-u-nu-latn" : "en-GB");

export const dateTime = (iso: string, locale: Locale) =>
  new Intl.DateTimeFormat(intl(locale), { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));

// Dates are "YYYY-MM-DD". Adding a time stops the browser from shifting the day by time zone.
const asDate = (date: string) => new Date(`${date}T00:00:00`);

export const weekdayName = (date: string, locale: Locale) => new Intl.DateTimeFormat(intl(locale), { weekday: "short" }).format(asDate(date));

// Built by hand: the Arabic format adds hidden direction marks that scramble "3/11" inside left-to-right text.
export const shortDate = (date: string) => {
  const d = asDate(date);
  return `${d.getDate()}/${d.getMonth() + 1}`;
};

// "31/8/2027": with the year, for dates that can be far away, like an expiry date.
export const fullDate = (date: string) => `${shortDate(date)}/${asDate(date).getFullYear()}`;

export const longDate = (date: string, locale: Locale) =>
  new Intl.DateTimeFormat(intl(locale), { weekday: "long", day: "numeric", month: "long" }).format(asDate(date));

export const STATUS_COLOR: Record<AppointmentStatus, string> = {
  booked: "bg-sky-100 text-sky-800",
  arrived: "bg-amber-100 text-amber-800",
  in_progress: "bg-brand-100 text-brand-800",
  done: "bg-emerald-100 text-emerald-800",
  cancelled: "bg-red-100 text-red-800",
  no_show: "bg-slate-200 text-slate-800",
};
