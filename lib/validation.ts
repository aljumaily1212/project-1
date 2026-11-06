import { z } from "zod";

// For number boxes that may stay empty: an empty box becomes null.
// React Hook Form also runs this on the starting value, which is null itself, so null must stay null:
// Number(null) is 0, and a silent 0 would count as a real reading.
// Today's date on this computer, as "YYYY-MM-DD". toISOString() would give the date in UTC,
// which in Iraq (UTC+3) is still yesterday between midnight and 3 AM.
export function localToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export const numberOrNull = (value: unknown) => (value === "" || value === null || value === undefined ? null : Number(value));

const phone = z.string().regex(/^07\d{9}$/, "validation.phone");

// The same rules as the server (validate_three_part_name in the backend), so the form and the server agree.
// Titles at the start are not part of the name: "د. علي حسن كاظم" is three parts.
const TITLE = /^(د|د\.|د\/|دكتور|الدكتور|أستاذ|استاذ|الأستاذ|مهندس|المهندس|سيد|السيد|شيخ|الشيخ|حاج|الحاج|dr\.?|mr\.?|mrs\.?|ms\.?)$/i;
// Words that belong to the next word: "عبد الكريم", "أبو بكر", "أم كلثوم", "ابن بطوطة", "آل ...", "Abd al Kareem".
const JOINS_NEXT = /^(عبد|ابو|أبو|ام|أم|ابن|آل|abd|abdul|abdel|abu|al|el)$/i;
// Words that belong to the word before: "نور الدين", "فضل الله", "عطاء الله".
const JOINS_PREVIOUS = /^(الدين|الله)$/;
// Not copied from the server: it also joins "محمد علي" and "محمد حسن" into one part, but "محمد علي حسن"
// (Mohammed, son of Ali, son of Hassan) is a normal three-part name, so that rule would reject real people.

// Splits a full name into its parts: the person's name, the father's, the grandfather's.
export function nameParts(value: string) {
  const words = value.trim().split(/\s+/).filter(Boolean);
  while (words.length && TITLE.test(words[0])) words.shift();
  const parts: string[] = [];
  for (const word of words) {
    const last = parts[parts.length - 1];
    const glue = last !== undefined && (JOINS_NEXT.test(last.split(" ").pop() ?? "") || JOINS_PREVIOUS.test(word));
    if (glue) parts[parts.length - 1] = `${last} ${word}`;
    else parts.push(word);
  }
  return parts;
}

// A person's full name: exactly three parts, like "Yasser Ammar Abdalkreem". Each part at least 2 letters.
const fullName = z
  .string()
  .trim()
  .min(1, "validation.name")
  .max(60, "validation.name3")
  .refine((v) => {
    const parts = nameParts(v);
    return parts.length === 3 && parts.every((p) => p.length >= 2);
  }, "validation.name3");
const password = z.string().min(6, "validation.password");

export const loginSchema = z.object({ phone, password });
export type LoginForm = z.infer<typeof loginSchema>;

export const registerSchema = loginSchema.extend({
  name: fullName,
});
export type RegisterForm = z.infer<typeof registerSchema>;

// ---------- passwords ----------

export const forgotSchema = z.object({ phone });
export type ForgotForm = z.infer<typeof forgotSchema>;

// The new password is typed twice, so a typo doesn't lock the person out.
const newPasswordPair = { new_password: password, confirm: z.string() };
const sameTwice = (v: { new_password: string; confirm: string }) => v.new_password === v.confirm;

export const resetSchema = z
  .object({ code: z.string().regex(/^\d{6}$/, "validation.code"), ...newPasswordPair })
  .refine(sameTwice, { message: "validation.passwordMatch", path: ["confirm"] });
export type ResetForm = z.infer<typeof resetSchema>;

export const changePasswordSchema = z
  .object({ current_password: z.string().min(1, "validation.required"), ...newPasswordPair })
  .refine(sameTwice, { message: "validation.passwordMatch", path: ["confirm"] });
export type ChangePasswordForm = z.infer<typeof changePasswordSchema>;

export const walkInSchema = z.object({
  name: fullName,
  phone,
  doctor_id: z.string(),
  emergency: z.boolean(),
});
export type WalkInForm = z.infer<typeof walkInSchema>;

// A caller who has never been to the clinic: just a name and a phone, like a walk-in.
export const newPatientSchema = z.object({
  name: fullName,
  phone,
});
export type NewPatientForm = z.infer<typeof newPatientSchema>;

// Someone on a patient's account. Birth date and phone are optional; empty boxes give "".
export const familySchema = z.object({
  name: fullName,
  relation: z.enum(["child", "parent", "spouse", "sibling", "other"]),
  birth_date: z.string().refine((d) => d === "" || d <= localToday(), "validation.futureDate"),
  phone: z.string().trim().refine((p) => p === "" || /^07\d{9}$/.test(p), "validation.phone"),
});
export type FamilyForm = z.infer<typeof familySchema>;

// Staff accounts are made by reception. Doctors also need their profile.
export const staffSchema = z
  .object({
    name: fullName,
    phone,
    password,
    role: z.enum(["reception", "doctor", "pharmacy", "lab", "accountant", "manager", "patient"]),
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

// Editing an account: the new password is optional, empty means "keep the old one".
export const editStaffSchema = z.object({
  name: fullName,
  phone,
  new_password: z.union([z.literal(""), password]),
});
export type EditStaffForm = z.infer<typeof editStaffSchema>;

const wholeNumber = (min: number, max: number) =>
  z.number("validation.number").int("validation.number").min(min, "validation.number").max(max, "validation.number");

export const settingsSchema = z.object({
  cancel_hours: wholeNumber(0, 72),
  no_show_limit: wholeNumber(1, 10),
  deposit_amount: wholeNumber(0, 1_000_000),
  prescription_days: wholeNumber(1, 90),
  usd_rate: wholeNumber(1, 100_000),
  welfare_discount_percent: wholeNumber(0, 100),
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
  // From / to for each weekday ("HH:MM"). Empty means the shift's usual hours.
  hours: z
    .array(
      z
        .object({ start: z.string(), end: z.string() })
        .refine((h) => !h.start || !h.end || h.end > h.start, { message: "validation.hours", path: ["end"] }),
    )
    .length(7),
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
  // "" means no follow-up; otherwise the number of days, as text from the select box.
  follow_up_days: z.enum(["", "3", "7", "14", "30"]),
});
export type VisitForm = z.infer<typeof visitSchema>;

export const MAX_FILE_BYTES = 2 * 1024 * 1024;
const FILE_TYPES = ["application/pdf", "image/png", "image/jpeg"];

// An empty number box gives "", which means "no value". Used for the optional normal range.
const optionalNumber = z.number("validation.number").nullable();

// One reading: its name, the value (required), the unit, and an optional normal range.
const resultRowSchema = z
  .object({
    name: z.string().trim().min(1, "validation.required"),
    value: z.number("validation.resultValue"),
    unit: z.string().trim(),
    ref_low: optionalNumber,
    ref_high: optionalNumber,
  })
  .refine((row) => row.ref_low === null || row.ref_high === null || row.ref_low <= row.ref_high, {
    path: ["ref_high"],
    message: "validation.range",
  });

const note = z.string().trim().max(300, "validation.tooLong");

// The lab enters readings (one or more, like the parts of a blood count), or a file. Both can have a note.
// One flat shape for both, so the form can keep a list of rows; the checks depend on the type.
// Switching to "file" empties the rows, so only the chosen type's fields are ever checked.
export const resultSchema = z
  .object({
    type: z.enum(["values", "file"]),
    rows: z.array(resultRowSchema),
    sample: z.enum(["blood", "urine", "stool", "swab", "other"]),
    note,
    file: z.instanceof(File).optional(),
  })
  .superRefine((entry, ctx) => {
    if (entry.type === "values" && entry.rows.length === 0) {
      ctx.addIssue({ code: "custom", path: ["rows"], message: "validation.oneReading" });
    }
    if (entry.type !== "file") return;
    const issue = !entry.file
      ? "validation.file"
      : !FILE_TYPES.includes(entry.file.type)
        ? "validation.fileType"
        : entry.file.size > MAX_FILE_BYTES
          ? "validation.fileSize"
          : null;
    if (issue) ctx.addIssue({ code: "custom", path: ["file"], message: issue });
  });
export type ResultForm = z.infer<typeof resultSchema>;

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

// ---------- vital signs ----------

// An empty box is null. A filled one must be in a range a person can have, to catch typing mistakes like 1200.
const reading = (min: number, max: number) => z.number("validation.number").min(min, "validation.vitalRange").max(max, "validation.vitalRange").nullable();

export const vitalsSchema = z
  .object({
    systolic: reading(50, 260),
    diastolic: reading(30, 160),
    temperature: reading(33, 43),
    pulse: reading(30, 220),
    spo2: reading(50, 100),
    weight: reading(0.5, 300),
    height: reading(30, 230),
  })
  .refine((v) => Object.values(v).some((x) => x !== null), { path: ["systolic"], message: "validation.oneVital" })
  // Blood pressure is a pair: both numbers or neither, and the top one higher.
  .refine((v) => (v.systolic === null) === (v.diastolic === null), { path: ["diastolic"], message: "validation.bpPair" })
  .refine((v) => v.systolic === null || v.diastolic === null || v.systolic > v.diastolic, { path: ["diastolic"], message: "validation.bpOrder" });
export type VitalsForm = z.infer<typeof vitalsSchema>;

// ---------- expenses ----------

export const expenseSchema = z.object({
  date: z.string().min(10, "validation.required").refine((d) => d <= localToday(), "validation.futureDate"),
  category: z.enum(["rent", "salaries", "power", "supplies", "medicines", "maintenance", "other"]),
  amount: z.number("validation.number").positive("validation.number"),
  currency: z.enum(["IQD", "USD"]),
  note: z.string().trim().max(200, "validation.tooLong"),
});
export type ExpenseForm = z.infer<typeof expenseSchema>;

// ---------- pharmacy stock ----------

// Units the pharmacy counts in. The screen shows them translated.
export const STOCK_UNITS = ["tablet", "capsule", "bottle", "tube", "injection", "sachet"] as const;

const count = z.number("validation.number").int("validation.number").min(0, "validation.number");

// An empty date box gives "", which means "no expiry date".
export const stockSchema = z.object({
  name: z.string().trim().min(2, "validation.required"),
  price: count,
  unit: z.enum(STOCK_UNITS),
  quantity: count,
  low_level: count,
  expires_on: z.string(),
  // An empty box means "no barcode yet".
  barcode: z.string().trim(),
});
export type StockForm = z.infer<typeof stockSchema>;

export const receiveSchema = z.object({
  quantity: count.positive("validation.number"),
  expires_on: z.string(),
});
export type ReceiveForm = z.infer<typeof receiveSchema>;

// One line per medicine. An empty stock_id means it is not given from our shelves.
export const dispenseSchema = z.object({
  lines: z.array(
    z
      .object({
        stock_id: z.string(),
        quantity: count,
        // "0" means "only when needed".
        times_per_day: z.enum(["1", "2", "3", "4", "0"]),
        timing: z.enum(["before_food", "after_food", "any"]),
        note: z.string().trim().max(120, "validation.tooLong"),
      })
      .refine((line) => line.stock_id === "" || line.quantity > 0, { path: ["quantity"], message: "validation.number" }),
  ),
});
export type DispenseForm = z.infer<typeof dispenseSchema>;
