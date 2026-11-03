import { getRefreshToken } from "../auth";
import { http } from "./axios";
import type {
  AuditEntry,
  BookRequest,
  ClinicSettings,
  CreateStaffRequest,
  Doctor,
  DoctorDay,
  DoctorSchedule,
  DoctorVisit,
  FamilyMember,
  FinishVisitRequest,
  LoginRequest,
  LoginResponse,
  ManagerOverview,
  MyAppointment,
  PatientVisit,
  Prescription,
  RegisterRequest,
  RescheduleRequest,
  Slot,
  StaffAppointment,
  StaffUser,
  UpdateScheduleRequest,
  VisitKind,
  WalkInRequest,
  WalkInResult,
} from "./types";

export const httpApi = {
  login: (body: LoginRequest) => http.post<LoginResponse>("/auth/login", body).then((r) => r.data),

  register: (body: RegisterRequest) => http.post<LoginResponse>("/auth/register", body).then((r) => r.data),

  logout: () => {
    const refresh_token = getRefreshToken();
    if (!refresh_token) return Promise.resolve();
    return http.post<null>("/auth/logout", { refresh_token }).then(
      () => undefined,
      () => undefined,
    );
  },

  listDoctors: () => http.get<Doctor[]>("/public/doctors").then((r) => r.data),

  doctorDays: (doctorId: number) => http.get<DoctorDay[]>(`/doctors/${doctorId}/days`).then((r) => r.data),

  doctorSlots: (doctorId: number, date: string, kind: VisitKind) =>
    http.get<Slot[]>(`/doctors/${doctorId}/slots`, { params: { date, kind } }).then((r) => r.data),

  myFamily: () => http.get<FamilyMember[]>("/me/family").then((r) => r.data),

  myAppointments: () => http.get<MyAppointment[]>("/me/appointments").then((r) => r.data),

  myVisits: () => http.get<PatientVisit[]>("/me/visits").then((r) => r.data),

  book: (body: BookRequest) => http.post<null>("/appointments", body).then(() => undefined),

  cancelAppointment: (id: number) => http.post<null>(`/appointments/${id}/cancel`, {}).then(() => undefined),

  rescheduleAppointment: (id: number, body: RescheduleRequest) =>
    http.post<null>(`/appointments/${id}/reschedule`, body).then(() => undefined),

  bookedToday: () => http.get<StaffAppointment[]>("/appointments/booked-today").then((r) => r.data),

  doctorQueue: (doctorId: number) =>
    http.get<StaffAppointment[]>(`/doctors/${doctorId}/queue`).then((r) => r.data),

  checkIn: (id: number, emergency: boolean) =>
    http.post<null>(`/appointments/${id}/check-in`, { emergency }).then(() => undefined),

  addWalkIn: (body: WalkInRequest) => http.post<WalkInResult>("/walk-ins", body).then((r) => r.data),

  startVisit: (id: number) => http.post<null>(`/appointments/${id}/start`, {}).then(() => undefined),

  patientHistory: (patientId: number) =>
    http.get<DoctorVisit[]>(`/patients/${patientId}/visits`).then((r) => r.data),

  finishVisit: (id: number, body: FinishVisitRequest) =>
    http.post<null>(`/appointments/${id}/finish`, body).then(() => undefined),

  listPrescriptions: () => http.get<Prescription[]>("/prescriptions").then((r) => r.data),

  dispense: (id: number) => http.post<null>(`/prescriptions/${id}/dispense`, {}).then(() => undefined),

  listStaff: () => http.get<StaffUser[]>("/users").then((r) => r.data),

  createStaff: (body: CreateStaffRequest) => http.post<null>("/users", body).then(() => undefined),

  getSettings: () => http.get<ClinicSettings>("/settings").then((r) => r.data),

  updateSettings: (body: ClinicSettings) => http.put<ClinicSettings>("/settings", body).then((r) => r.data),

  listAudit: () => http.get<AuditEntry[]>("/audit").then((r) => r.data),

  managerOverview: () => http.get<ManagerOverview>("/manager/overview").then((r) => r.data),

  listSchedules: () => http.get<DoctorSchedule[]>("/doctors/schedules").then((r) => r.data),

  updateSchedule: (doctorId: number, body: UpdateScheduleRequest) =>
    http.put<null>(`/doctors/${doctorId}/schedule`, body).then(() => undefined),

  // Returns how many appointments were cancelled.
  markAbsent: (doctorId: number, date: string) =>
    http.post<{ cancelled: number }>(`/doctors/${doctorId}/absences`, { date }).then((r) => r.data),

  // Returns how many patients were told.
  markLate: (doctorId: number, minutes: number) =>
    http.post<{ notified: number }>(`/doctors/${doctorId}/late`, { minutes }).then((r) => r.data),
};

export type Api = typeof httpApi;
