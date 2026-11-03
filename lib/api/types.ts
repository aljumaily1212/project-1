export type ApiEnvelope<T> =
  | { success: true; data: T }
  | { success: false; message: string; errors?: Record<string, unknown>; code?: string };

export type Role = "patient" | "reception" | "doctor" | "pharmacy";
export type StaffRole = Exclude<Role, "patient">;
export type Day = "today" | "tomorrow";
export type AppointmentStatus = "booked" | "arrived" | "in_progress" | "done" | "cancelled";

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
  branch: string;
  branch_ar: string;
  fee: number;
}

export interface Slot {
  time: string;
  available: boolean;
}

export interface FamilyMember {
  id: number;
  name: string;
}

export interface BookRequest {
  patient_id: number;
  doctor_id: number;
  day: Day;
  time: string;
}

export interface MyAppointment {
  id: number;
  patient_name: string;
  doctor: Doctor;
  day: Day;
  time: string;
  status: AppointmentStatus;
  ahead: number | null;
}

export interface StaffAppointment {
  id: number;
  patient_id: number;
  patient_name: string;
  doctor_id: number;
  day: Day;
  time: string;
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
    branch: "main" | "second";
    fee: number;
  };
}

export interface Prescription {
  id: number;
  patient_name: string;
  medicines: Medicine[];
  dispensed: boolean;
}
