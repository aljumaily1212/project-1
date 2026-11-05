import type { AppNotification } from "./api/types";
import { longDate, yearDate } from "./display";
import type { Locale, TFunction } from "./i18n";

// Turns a stored message into a sentence in the reader's language.
// Shared by the patient's notifications page and the staff bell.
export function messageText(n: AppNotification, t: TFunction, locale: Locale) {
  const p = n.params;
  const date = typeof p.date === "string" ? longDate(p.date, locale) : "";
  switch (n.type) {
    case "doctor_absent":
      return t("notifications.doctor_absent", { doctor: p.doctor, date, time: p.time });
    case "doctor_late":
      return t("notifications.doctor_late", { doctor: p.doctor, minutes: p.minutes });
    case "result_ready":
      return t("notifications.result_ready", { test: p.test });
    case "reminder":
      return t("notifications.reminder", { doctor: p.doctor, date, time: p.time });
    case "turn_near":
      return Number(p.n) === 0 ? t("notifications.turn_now", { doctor: p.doctor }) : t("notifications.turn_near", { doctor: p.doctor, n: p.n });
    case "booked":
      return t("notifications.booked", { doctor: p.doctor, date, time: p.time });
    case "rate_visit":
      return t("notifications.rate_visit", { doctor: p.doctor });
    case "follow_up":
      return t("notifications.follow_up", { doctor: p.doctor, date });
    case "result_for_doctor": {
      const text = t("notifications.result_for_doctor", { test: p.test, patient: p.patient });
      // abnormal is 1 when a reading is outside its normal range, so the doctor knows to look soon.
      return Number(p.abnormal) === 1 ? `${text} ${t("notifications.abnormal")}` : text;
    }
    case "welfare_submitted":
      return t("notifications.welfare_submitted", { patient: p.patient });
    case "welfare_approved":
      return t("notifications.welfare_approved", { patient: p.patient, percent: p.percent, date: typeof p.date === "string" ? yearDate(p.date, locale) : "" });
    case "welfare_rejected":
      return t("notifications.welfare_rejected", { patient: p.patient, reason: p.reason });
    default: {
      // A new message type without a sentence here fails the type check, instead of showing an empty message.
      const missing: never = n.type;
      return String(missing);
    }
  }
}
