export type ApiEnvelope<T> =
  | { success: true; data: T }
  | { success: false; message: string; errors?: Record<string, unknown>; code?: string };

export type Role = "patient" | "reception" | "doctor" | "pharmacy" | "manager" | "lab" | "accountant";
export type StaffRole = Exclude<Role, "patient">;
export type AppointmentStatus = "booked" | "arrived" | "in_progress" | "done" | "cancelled" | "no_show";

export type BranchId = "main" | "second";
export type Shift = "morning" | "evening";
export type VisitKind = "new" | "followup";
export type CancelReason = "patient" | "doctor_absent";

// A long list comes in parts. `limit` is how many to send (the server sends at most 200),
// `offset` how many to skip from the start. `total` is how many there are in all, with the same filters.
export interface PageQuery {
  limit: number;
  offset?: number;
}

export interface Page<T> {
  items: T[];
  total: number;
}

export interface User {
  id: number;
  name: string;
  phone: string;
  role: Role;
  doctor_id?: number | null;
}

export interface LoginRequest {
  phone: string;
  password: string;
}

export interface RegisterRequest extends LoginRequest {
  name: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  user: User;
}

export interface Doctor {
  id: number;
  name: string;
  name_ar: string;
  specialty: string;
  specialty_ar: string;
  fee: number;
  new_minutes: number;
  followup_minutes: number;
}

// Where and when a doctor works on one weekday. null means a day off.
export interface WorkDay {
  branch: BranchId;
  shift: Shift;
}

export interface DoctorDay {
  date: string;
  work: WorkDay | null;
  absent: boolean;
}

export interface DoctorSchedule {
  doctor: Doctor;
  // The clinic's share in percent. The doctor gets the rest.
  clinic_percent: number;
  service_percent: number;
  days: (WorkDay | null)[];
  absences: string[];
  late: { date: string; minutes: number } | null;
}

export interface UpdateScheduleRequest {
  fee: number;
  clinic_percent: number;
  service_percent: number;
  new_minutes: number;
  followup_minutes: number;
  days: (WorkDay | null)[];
}

export interface Slot {
  time: string;
  available: boolean;
}

export type Relation = "self" | "child" | "parent" | "spouse" | "sibling" | "other";

export type BloodType = "A+" | "A-" | "B+" | "B-" | "AB+" | "AB-" | "O+" | "O-";

// What everyone treating the patient must know first. Written by the doctor.
export interface MedicalAlerts {
  // Medicines or substances the patient reacts to, like "Penicillin" or "Aspirin".
  allergies: string[];
  // Long-term diseases, like diabetes or high blood pressure.
  conditions: string[];
  blood_type: BloodType | null;
}

export interface FamilyMember {
  id: number;
  name: string;
  relation: Relation;
  // Both optional: a small child has no phone, and some people don't know an exact birth date.
  birth_date: string | null;
  phone: string | null;
  alerts: MedicalAlerts;
}

// What a patient sends to add or edit someone on their account. "self" is the account owner and can't be added.
export interface FamilyInput {
  name: string;
  relation: Exclude<Relation, "self">;
  birth_date: string | null;
  phone: string | null;
}

// clinic: pay everything at the clinic. deposit: pay part online now. full: pay everything online now.
export type PayChoice = "clinic" | "deposit" | "full";

export interface BookRequest {
  patient_id: number;
  doctor_id: number;
  date: string;
  time: string;
  kind: VisitKind;
  pay: PayChoice;
  // The same key on a repeated request means "this is the same booking", so nothing is booked or charged twice.
  idempotency_key: string;
}

// Reception books for someone who phoned: an existing patient, or a new one by name and phone.
export interface StaffBookRequest {
  patient_id: number | null;
  new_patient: { name: string; phone: string } | null;
  doctor_id: number;
  date: string;
  time: string;
  kind: VisitKind;
  idempotency_key: string;
}

export interface StaffBookResult {
  patient_id: number;
}

export interface BookingRules {
  no_shows: number;
  deposit_required: boolean;
  deposit_amount: number;
}

export interface RescheduleRequest {
  date: string;
  time: string;
}

export interface MyAppointment {
  id: number;
  patient_name: string;
  doctor: Doctor;
  date: string;
  time: string;
  kind: VisitKind;
  branch: BranchId;
  status: AppointmentStatus;
  ahead: number | null;
  can_change: boolean;
  cancel_reason: CancelReason | null;
  late_minutes: number;
  // The queue number, like "A-012". null until the patient arrives at the clinic.
  ticket: string | null;
  money: MoneySummary;
}

export interface StaffAppointment {
  id: number;
  patient_id: number;
  patient_name: string;
  doctor_id: number;
  date: string;
  time: string;
  kind: VisitKind;
  branch: BranchId;
  status: AppointmentStatus;
  emergency: boolean;
  ticket: string | null;
  // True once someone has measured blood pressure, temperature and so on for this visit.
  has_vitals: boolean;
}

// Measurements taken before the doctor sees the patient. Any of them can be missing (null).
export interface Vitals {
  // Blood pressure, in mmHg: the top and bottom numbers of "120/80".
  systolic: number | null;
  diastolic: number | null;
  // Degrees Celsius.
  temperature: number | null;
  // Heart beats per minute.
  pulse: number | null;
  // Oxygen in the blood, in percent.
  spo2: number | null;
  weight: number | null;
  // Centimetres.
  height: number | null;
}

export interface VitalsRecord extends Vitals {
  appointment_id: number;
  at: string;
  by: string;
}

// ---------- passwords ----------

// Step 1 of "forgot password": the server sends a 6-digit code by SMS to the phone.
// It answers the same way whether or not the phone has an account, so nobody can use it to check who is registered.
export interface ForgotPasswordResult {
  expires_in_minutes: number;
  // Only the fake API fills this in, because it can't send an SMS. The real server must never return it.
  dev_code?: string;
}

export interface ResetPasswordRequest {
  phone: string;
  code: string;
  new_password: string;
}

export interface ChangePasswordRequest {
  current_password: string;
  new_password: string;
}

export interface WalkInRequest {
  name: string;
  phone: string;
  doctor_id: number;
  emergency: boolean;
  // Made once per walk-in, in the browser. If the same request reaches the server twice
  // (a retry, or the offline outbox sending again), the server must add the patient only once.
  idempotency_key: string;
}

export interface WalkInResult {
  duplicate: boolean;
}

export type DoseTiming = "before_food" | "after_food" | "any";

// How the patient takes a medicine, set by the pharmacist when dispensing. times_per_day 0 means "only when needed".
export interface DoseInstructions {
  times_per_day: number;
  timing: DoseTiming;
  note: string;
}

export interface Medicine {
  name: string;
  dose: string;
  days: number;
  instructions?: DoseInstructions;
}

export interface PatientVisit {
  id: number;
  created_at: string;
  patient_name: string;
  doctor: Doctor;
  diagnosis: string;
  medicines: Medicine[];
}

// How the patient rated a finished visit: 1 to 5 stars and an optional comment.
export interface VisitRating {
  stars: number;
  comment: string;
  at: string;
}

// A visit as the patient sees it, with their rating once they've given one.
export interface MyVisit extends PatientVisit {
  rating: VisitRating | null;
}

export interface RateVisitRequest {
  stars: number;
  comment: string;
}

export type ServiceKind = "test" | "xray" | "procedure";
export type Currency = "IQD" | "USD";
export type Amounts = Record<Currency, number>;

export interface MoneySummary {
  total: Amounts;
  paid: Amounts;
  balance: Amounts;
}

// One line on the bill. The price is copied when the line is added, so later price changes don't touch it.
export interface InvoiceItem {
  id: number;
  label: string;
  label_ar: string;
  kind: "visit" | ServiceKind;
  price: number;
  currency: Currency;
}

export type PaymentMethod = "cash" | "online";
export type PaymentKind = "payment" | "refund" | "reversal";

export interface Payment {
  id: number;
  amount: number;
  currency: Currency;
  method: PaymentMethod;
  kind: PaymentKind;
  at: string;
  by: string;
  reason: string;
}

export interface Invoice {
  appointment_id: number;
  patient_name: string;
  doctor_name: string;
  date: string;
  time: string;
  status: AppointmentStatus;
  items: InvoiceItem[];
  payments: Payment[];
  money: MoneySummary;
}

export interface PayRequest {
  amount: number;
  currency: Currency;
  idempotency_key: string;
}

export interface ServiceInput {
  name: string;
  name_ar: string;
  kind: ServiceKind;
  price: number;
  currency: Currency;
}

// Anything the clinic charges for besides the visit: tests, X-rays and small procedures.
export interface Service {
  id: number;
  name: string;
  name_ar: string;
  kind: ServiceKind;
  price: number;
  currency: Currency;
  // The readings this test usually has, so the lab form starts filled in. Missing for X-rays and procedures.
  template?: ResultTemplateRow[];
}

export type SampleType = "blood" | "urine" | "stool" | "swab" | "other";

// One reading inside a test, like "Hb" in a blood count. The normal range is empty when the lab gives none.
export interface ResultRow {
  name: string;
  value: number;
  unit: string;
  ref_low: number | null;
  ref_high: number | null;
}

// A reading the test usually has, before the lab fills in the value.
export type ResultTemplateRow = Omit<ResultRow, "value">;

// A result is a list of readings, or a file (a PDF or an X-ray image).
// "number" is the older one-number form, still shown for results saved before readings existed.
export type LabResult =
  | { type: "values"; rows: ResultRow[]; sample: SampleType; note: string }
  | { type: "file"; file_name: string; file_type: string; data_url: string; note?: string }
  | { type: "number"; value: number; unit: string };

// What the lab sends to save a result. A file goes as the real file, not a data URL.
export type ResultInput =
  | { type: "values"; rows: ResultRow[]; sample: SampleType; note: string }
  | { type: "file"; file: File; note: string };

export type LabStatus = "requested" | "entered" | "confirmed";

export interface ResultEdit {
  at: string;
  by: string;
  before: LabResult;
}

// The lab only sees the request itself, never the diagnosis or the rest of the file.
export interface LabOrder {
  id: number;
  patient_name: string;
  doctor_name: string;
  test: Service;
  status: LabStatus;
  result: LabResult | null;
  history: ResultEdit[];
  requested_at: string;
}

// Patients and doctors see results only after the lab confirms them.
export interface TestResult {
  id: number;
  patient_name: string;
  test: Service;
  result: LabResult;
  confirmed_at: string;
}

export interface VisitTest {
  id: number;
  test: Service;
  status: LabStatus;
  result: LabResult | null;
}

export interface DoctorVisit extends PatientVisit {
  internal_note: string;
  tests: VisitTest[];
  // The date the doctor asked the patient to come back by, if they did.
  follow_up_on: string | null;
}

// A follow-up the doctor asked for that the patient hasn't booked yet.
export interface FollowUp {
  visit_id: number;
  patient_id: number;
  patient_name: string;
  doctor: Doctor;
  due: string;
}

export interface FinishVisitRequest {
  diagnosis: string;
  internal_note: string;
  medicines: Medicine[];
  test_ids: number[];
  procedure_ids: number[];
  // "Come back in N days". null means no follow-up is needed.
  follow_up_days: number | null;
}

// One doctor on the waiting room TV. Public, so it holds ticket numbers only, never patient names.
export interface ScreenDoctor {
  doctor: Doctor;
  branch: BranchId;
  absent: boolean;
  late_minutes: number;
  // The ticket in the room now, and when it was called.
  now: string | null;
  called_at: string | null;
  // The next few tickets in order.
  next: string[];
  waiting: number;
}

// ---------- pharmacy stock ----------

export type StockLevel = "ok" | "low" | "out";
export type StockExpiry = "ok" | "soon" | "expired" | "none";

// One medicine on the pharmacy's shelves. Quantities are in its unit, for example tablets.
export interface StockItem {
  id: number;
  name: string;
  unit: string;
  quantity: number;
  // At or below this number the item counts as running low.
  low_level: number;
  expires_on: string | null;
  // The product number from the box's barcode, so scanning finds the item. null until one is scanned.
  barcode: string | null;
  // The selling price of one unit (one tablet, one bottle…), in dinars.
  price: number;
  // Worked out by the server, so every screen agrees on what "low" and "expiring" mean.
  level: StockLevel;
  expiry: StockExpiry;
}

export interface StockInput {
  name: string;
  price: number;
  unit: string;
  quantity: number;
  low_level: number;
  expires_on: string | null;
  barcode: string | null;
}

// A new delivery: adds to the quantity. A new expiry date replaces the old one.
export interface ReceiveStockRequest {
  quantity: number;
  expires_on: string | null;
}

export type StockMoveKind = "create" | "receive" | "dispense" | "edit" | "sale";

// One line of a pharmacy sale. The price is copied at the time of sale, so later price changes don't touch it.
export interface SaleLine {
  stock_id: number;
  name: string;
  unit: string;
  quantity: number;
  unit_price: number;
  total: number;
}

// Money the pharmacy took in, in dinars: for a prescription, or sold over the counter.
export interface PharmacySale {
  id: number;
  at: string;
  by: string;
  kind: "prescription" | "counter";
  // The patient for a prescription; an optional name for a counter sale.
  customer: string;
  lines: SaleLine[];
  total: number;
}

export interface CounterSaleRequest {
  customer: string;
  lines: { stock_id: number; quantity: number }[];
  idempotency_key: string;
}

// One change to the stock, kept forever, so the pharmacy can see who changed what and when.
export interface StockMove {
  id: number;
  at: string;
  by: string;
  kind: StockMoveKind;
  stock_id: number;
  item_name: string;
  unit: string;
  // How much the quantity went up (+) or down (-). 0 when only details like the name changed.
  change: number;
  quantity_after: number;
  // For a dispense, the patient's name.
  note: string;
}

// What the doctor sees of the pharmacy's stock while prescribing: the name, and whether it can be given.
// "expired" counts as not available. Quantities stay with the pharmacy.
export interface CatalogMedicine {
  name: string;
  availability: "available" | "low" | "out" | "expired";
}

// One line per medicine on the prescription, in the same order. stock_id null means it came from outside the pharmacy.
export interface DispenseLine {
  stock_id: number | null;
  quantity: number;
  instructions: DoseInstructions;
}

export interface DispenseRequest {
  lines: DispenseLine[];
}

export interface FinishVisitResult {
  next_ticket: string | null;
}

// An account in the users list. Reception sees staff only; the manager also sees patient accounts.
export interface StaffUser {
  id: number;
  name: string;
  phone: string;
  role: Role;
  // A stopped account can't sign in. It isn't deleted, so its name stays in the records it made.
  active: boolean;
}

// The manager fixes a name or phone, or sets a new password for someone who forgot theirs.
// The role can't change: a different job gets a new account.
export interface UpdateStaffRequest {
  name: string;
  phone: string;
  new_password?: string;
}

export interface CreateStaffRequest {
  name: string;
  phone: string;
  password: string;
  // Reception can make staff accounts. Only the manager can make manager and patient accounts.
  role: Role;
  doctor?: {
    name_en: string;
    specialty_ar: string;
    specialty_en: string;
    branch: BranchId;
    fee: number;
  };
}

// Rules the client will decide. The manager can change them at any time.
export interface ClinicSettings {
  cancel_hours: number;
  no_show_limit: number;
  deposit_amount: number;
  prescription_days: number;
  usd_rate: number;
}

export type AuditAction =
  | "file.open"
  | "visit.finish"
  | "prescription.dispense"
  | "staff.create"
  | "settings.update"
  | "appointment.book"
  | "appointment.cancel"
  | "appointment.reschedule"
  | "appointment.checkin"
  | "walkin.add"
  | "doctor.update"
  | "doctor.absent"
  | "doctor.late"
  | "lab.result"
  | "lab.confirm"
  | "lab.edit"
  | "payment.cash"
  | "payment.online"
  | "payment.refund"
  | "appointment.no_show"
  | "service.update"
  | "service.create"
  | "payment.reverse"
  | "account.delete"
  | "alerts.update"
  | "vitals.save"
  | "cash.close"
  | "pharmacy.sale"
  | "expense.add"
  | "expense.void"
  | "password.reset"
  | "password.change"
  | "staff.update"
  | "staff.disable"
  | "staff.enable"
  | "family.add"
  | "family.remove"
  | "stock.create"
  | "stock.update"
  | "stock.receive";

// One line in the accountant's book. Nothing here can be deleted.
export interface LedgerEntry extends Payment {
  appointment_id: number;
  patient_name: string;
  doctor_name: string;
  reversible: boolean;
}

// The cash a receptionist took since their last closing (or since the start of the day).
export interface ShiftSummary {
  opened_at: string;
  payments: number;
  expected: Amounts;
}

// One end-of-shift count: what the system expected, what was counted, and the difference (counted − expected).
export interface CashClosing {
  id: number;
  by: string;
  opened_at: string;
  closed_at: string;
  payments: number;
  expected: Amounts;
  counted: Amounts;
  difference: Amounts;
  note: string;
}

export interface CloseShiftRequest {
  counted: Amounts;
  note: string;
}

export type ExpenseCategory = "rent" | "salaries" | "power" | "supplies" | "medicines" | "maintenance" | "other";

// Money the clinic paid out. A mistake is never deleted: it is voided, with who, when and why.
export interface Expense {
  id: number;
  date: string;
  category: ExpenseCategory;
  amount: number;
  currency: Currency;
  note: string;
  by: string;
  at: string;
  voided: { by: string; at: string; reason: string } | null;
}

export interface ExpenseInput {
  date: string;
  category: ExpenseCategory;
  amount: number;
  currency: Currency;
  note: string;
}

export interface DoctorDues {
  doctor_id: number;
  doctor_name: string;
  visits: number;
  visit_income: number;
  procedure_income: number;
  doctor_share: number;
  clinic_share: number;
}

export interface CountRow {
  label: string;
  count: number;
}

export interface Report {
  month: string;
  by_day: CountRow[];
  by_doctor: CountRow[];
  by_branch: CountRow[];
  top_no_shows: CountRow[];
  billed: Amounts;
  collected: Amounts;
  today_billed: Amounts;
  today_collected: Amounts;
  // Pharmacy sales in dinars, kept apart from visit money.
  pharmacy_month: number;
  pharmacy_today: number;
  // The month's expenses (voided ones left out), and what's left: collected + pharmacy − expenses.
  expenses: Amounts;
  profit: Amounts;
}

export interface AuditEntry {
  id: number;
  at: string;
  user_name: string;
  role: Role;
  action: AuditAction;
  target: string;
}

export interface ManagerOverview {
  appointments_today: number;
  waiting_now: number;
  visits_done_today: number;
  doctors: number;
  staff: number;
}

// One line in the patient search for reception and the manager.
export interface PatientSummary {
  id: number;
  name: string;
  phone: string;
  // false for walk-ins and family members added without their own login.
  has_account: boolean;
  relation: Relation | null;
  appointments: number;
  visits: number;
  no_shows: number;
  last_visit: string | null;
}

export interface PatientAppointment {
  id: number;
  doctor_name: string;
  date: string;
  time: string;
  kind: VisitKind;
  branch: BranchId;
  status: AppointmentStatus;
  emergency: boolean;
  cancel_reason: CancelReason | null;
  money: MoneySummary;
}

export interface PatientFileVisit {
  id: number;
  created_at: string;
  doctor_name: string;
  diagnosis: string;
  medicines: Medicine[];
  dispensed: boolean;
  tests: VisitTest[];
}

// Everything about one patient, newest first. The doctor's private notes are not included.
export interface PatientFile {
  patient: PatientSummary;
  alerts: MedicalAlerts;
  family: FamilyMember[];
  appointments: PatientAppointment[];
  visits: PatientFileVisit[];
  payments: (Payment & { appointment_id: number })[];
  money: MoneySummary;
}

// One day on the manager's charts. Money is net dinars received that day.
export interface AnalyticsDay {
  date: string;
  visits: number;
  followups: number;
  no_shows: number;
  cancelled: number;
  collected: number;
  cash: number;
  online: number;
}

export interface Analytics {
  from: string;
  to: string;
  totals: {
    appointments: number;
    visits: number;
    no_shows: number;
    cancelled: number;
    walk_ins: number;
    followups: number;
    // Patients whose first visit ever falls inside the range.
    new_patients: number;
    collected: Amounts;
  };
  by_day: AnalyticsDay[];
  by_doctor: { label: string; visits: number; collected: number }[];
  // "09" means appointments that start between 9:00 and 9:59.
  by_hour: CountRow[];
  by_method: Record<PaymentMethod, number>;
  top_diagnoses: CountRow[];
  // Patient ratings of visits in the range. The comments carry no patient name, so patients can be honest.
  ratings: {
    by_doctor: { label: string; average: number; count: number }[];
    recent: { stars: number; comment: string; doctor: string; at: string }[];
  };
}

export type NotificationType = "doctor_absent" | "doctor_late" | "result_ready" | "reminder" | "turn_near" | "booked" | "rate_visit" | "follow_up" | "result_for_doctor";

export interface AppNotification {
  id: number;
  type: NotificationType;
  params: Record<string, string | number>;
  at: string;
  read: boolean;
}

export interface Prescription {
  id: number;
  patient_name: string;
  // The pharmacy needs the allergies to check what it gives. It still sees nothing else from the file.
  allergies: string[];
  medicines: Medicine[];
  dispensed: boolean;
  created_at: string;
  // After this time the pharmacy can't dispense it.
  expires_at: string;
  expired: boolean;
}
