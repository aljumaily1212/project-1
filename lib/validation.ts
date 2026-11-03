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
    role: z.enum(["reception", "doctor", "pharmacy"]),
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

export const medicineSchema = z.object({
  name: z.string().trim().min(1, "validation.required"),
  dose: z.string().trim().min(1, "validation.required"),
  days: z.number("validation.days").int("validation.days").min(1, "validation.days").max(365, "validation.days"),
});

export const visitSchema = z.object({
  diagnosis: z.string().trim().min(2, "validation.diagnosis"),
  internal_note: z.string().trim(),
  medicines: z.array(medicineSchema),
});
export type VisitForm = z.infer<typeof visitSchema>;
