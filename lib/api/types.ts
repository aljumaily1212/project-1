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

export type Relation = "self" | "child" | "parent" | "spouse";

export interface FamilyMember {
  id: number;
  name: string;
  relation: Relation;
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
}

export interface WalkInRequest {
  name: string;
  phone: string;
  doctor_id: number;
  emergency: boolean;
}

export interface WalkInResult {
  duplicate: boolean;
}

export interface Medicine {
  name: string;
  dose: string;
  days: number;
}

export interface PatientVisit {
  id: number;
  patient_name: string;
  doctor: Doctor;
  diagnosis: string;
  medicines: Medicine[];
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
}

// A result is either a number (like blood sugar) or a file (a PDF or an X-ray image).
export type LabResult =
  | { type: "number"; value: number; unit: string }
  | { type: "file"; file_name: string; file_type: string; data_url: string };

// What the lab sends to save a result. A file goes as the real file, not a data URL.
export type ResultInput = { type: "number"; value: number; unit: string } | { type: "file"; file: File };

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
}

export interface FinishVisitRequest {
  diagnosis: string;
  internal_note: string;
  medicines: Medicine[];
  test_ids: number[];
  procedure_ids: number[];
}

export interface StaffUser {
  id: number;
  name: string;
  phone: string;
  role: StaffRole;
}

export interface CreateStaffRequest {
  name: string;
  phone: string;
  password: string;
  role: StaffRole;
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
  | "account.delete";

// One line in the accountant's book. Nothing here can be deleted.
export interface LedgerEntry extends Payment {
  appointment_id: number;
  patient_name: string;
  doctor_name: string;
  reversible: boolean;
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
  family: FamilyMember[];
  appointments: PatientAppointment[];
  visits: PatientFileVisit[];
  payments: (Payment & { appointment_id: number })[];
  money: MoneySummary;
}

export type NotificationType = "doctor_absent" | "doctor_late" | "result_ready" | "reminder" | "turn_near";

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
  medicines: Medicine[];
  dispensed: boolean;
  created_at: string;
  // After this time the pharmacy can't dispense it.
  expires_at: string;
  expired: boolean;
}
