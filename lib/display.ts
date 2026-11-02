import type { AppointmentStatus, Doctor } from "./api/types";
import type { Locale } from "./i18n";

export const doctorName = (d: Doctor, locale: Locale) => (locale === "ar" ? d.name_ar : d.name);
export const doctorSpecialty = (d: Doctor, locale: Locale) => (locale === "ar" ? d.specialty_ar : d.specialty);
export const doctorBranch = (d: Doctor, locale: Locale) => (locale === "ar" ? d.branch_ar : d.branch);

export const money = (amount: number) => amount.toLocaleString("en-US");

export const STATUS_COLOR: Record<AppointmentStatus, string> = {
  booked: "bg-sky-100 text-sky-800",
  arrived: "bg-amber-100 text-amber-800",
  in_progress: "bg-brand-100 text-brand-800",
  done: "bg-emerald-100 text-emerald-800",
  cancelled: "bg-red-100 text-red-800",
};
