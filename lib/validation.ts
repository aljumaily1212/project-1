import { z } from "zod";

const phone = z.string().regex(/^07\d{9}$/, "validation.phone");
const password = z.string().min(6, "validation.password");

export const loginSchema = z.object({ phone, password });
export type LoginForm = z.infer<typeof loginSchema>;

export const registerSchema = loginSchema.extend({
  name: z.string().trim().min(2, "validation.name"),
});
export type RegisterForm = z.infer<typeof registerSchema>;

export const walkInSchema = z.object({
  name: z.string().trim().min(2, "validation.name"),
  phone,
  doctor_id: z.string(),
  emergency: z.boolean(),
});
export type WalkInForm = z.infer<typeof walkInSchema>;

// Staff accounts are made by reception. Doctors also need their profile.
export const staffSchema = z
  .object({
    name: z.string().trim().min(2, "validation.name"),
    phone,
    password,
    role: z.enum(["reception", "doctor", "pharmacy", "lab", "accountant"]),
    name_en: z.string().trim(),
    specialty_ar: z.string().trim(),
    specialty_en: z.string().trim(),
    branch: z.enum(["main", "second"]),
    fee: z.number("validation.fee").min(0, "validation.fee"),
  })
  .superRefine((values, ctx) => {
    if (values.role !== "doctor") return;
    for (const key of ["name_en", "specialty_ar", "specialty_en"] as const) {
      if (values[key].length < 2) ctx.addIssue({ code: "custom", path: [key], message: "validation.required" });
    }
  });
export type StaffForm = z.infer<typeof staffSchema>;

const wholeNumber = (min: number, max: number) =>
  z.number("validation.number").int("validation.number").min(min, "validation.number").max(max, "validation.number");

export const settingsSchema = z.object({
  cancel_hours: wholeNumber(0, 72),
  no_show_limit: wholeNumber(1, 10),
  deposit_amount: wholeNumber(0, 1_000_000),
  prescription_days: wholeNumber(1, 90),
  usd_rate: wholeNumber(1, 100_000),
});
export type SettingsForm = z.infer<typeof settingsSchema>;

// One choice per weekday: a day off, or a branch and a shift.
export const DAY_CHOICES = ["off", "main-morning", "main-evening", "second-morning", "second-evening"] as const;

export const scheduleSchema = z.object({
  fee: wholeNumber(0, 10_000_000),
  clinic_percent: wholeNumber(0, 100),
  service_percent: wholeNumber(0, 100),
  new_minutes: wholeNumber(5, 120),
  followup_minutes: wholeNumber(5, 120),
  days: z.array(z.enum(DAY_CHOICES)).length(7),
});
export type ScheduleForm = z.infer<typeof scheduleSchema>;

export const medicineSchema = z.object({
  name: z.string().trim().min(1, "validation.required"),
  dose: z.string().trim().min(1, "validation.required"),
  days: z.number("validation.days").int("validation.days").min(1, "validation.days").max(365, "validation.days"),
});

export const visitSchema = z.object({
  diagnosis: z.string().trim().min(2, "validation.diagnosis"),
  internal_note: z.string().trim(),
  medicines: z.array(medicineSchema),
  // Checkbox values are text, so the ids are numbers written as text.
  test_ids: z.array(z.string()),
  procedure_ids: z.array(z.string()),
});
export type VisitForm = z.infer<typeof visitSchema>;

export const MAX_FILE_BYTES = 2 * 1024 * 1024;
const FILE_TYPES = ["application/pdf", "image/png", "image/jpeg"];

// The lab enters either a number with its unit, or a file.
export const resultSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("number"),
    value: z.number("validation.resultValue"),
    unit: z.string().trim().min(1, "validation.required"),
  }),
  z.object({
    type: z.literal("file"),
    file: z
      .instanceof(File, { message: "validation.file" })
      .refine((f) => FILE_TYPES.includes(f.type), "validation.fileType")
      .refine((f) => f.size <= MAX_FILE_BYTES, "validation.fileSize"),
  }),
]);

export const serviceSchema = z.object({
  name: z.string().trim().min(2, "validation.required"),
  name_ar: z.string().trim().min(2, "validation.required"),
  kind: z.enum(["test", "xray", "procedure"]),
  price: z.number("validation.number").min(0, "validation.number"),
  currency: z.enum(["IQD", "USD"]),
});
export type ServiceForm = z.infer<typeof serviceSchema>;

// The amount must be more than zero and not more than what is left to pay.
export const paymentSchema = (max: number) =>
  z.object({
    amount: z.number("validation.number").positive("validation.number").max(max, "validation.overpay"),
  });

// A reversal must say why, so the manager can understand it later.
export const reverseSchema = z.object({
  reason: z.string().trim().min(3, "validation.reason"),
});
export type ReverseForm = z.infer<typeof reverseSchema>;

// Deleting an account needs the password and a clear yes.
export const deleteAccountSchema = z.object({
  password: z.string().min(1, "validation.required"),
  confirm: z.boolean().refine((ticked) => ticked, "validation.confirmDelete"),
});
export type DeleteAccountForm = z.infer<typeof deleteAccountSchema>;
