export type ApiEnvelope<T> =
  | { success: true; data: T }
  | { success: false; message: string; errors?: Record<string, unknown>; code?: string };

export type Role = "patient" | "reception" | "doctor" | "pharmacy" | "manager";
export type StaffRole = Exclude<Role, "patient">;
export type AppointmentStatus = "booked" | "arrived" | "in_progress" | "done" | "cancelled";

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
  days: (WorkDay | null)[];
  absences: string[];
  late: { date: string; minutes: number } | null;
}

export interface UpdateScheduleRequest {
  fee: number;
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

export interface BookRequest {
  patient_id: number;
  doctor_id: number;
  date: string;
  time: string;
  kind: VisitKind;
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

export interface DoctorVisit extends PatientVisit {
  internal_note: string;
}

export interface FinishVisitRequest {
  diagnosis: string;
  internal_note: string;
  medicines: Medicine[];
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
  | "doctor.late";

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

export type NotificationType = "doctor_absent" | "doctor_late";

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
}
