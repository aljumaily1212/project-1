import { getRefreshToken } from "../auth";
import { http } from "./axios";
import type {
  Analytics,
  AppNotification,
  AuditEntry,
  BookRequest,
  BookingRules,
  ClinicSettings,
  CreateStaffRequest,
  Doctor,
  DoctorDay,
  DoctorDues,
  DoctorSchedule,
  DoctorVisit,
  FamilyMember,
  FinishVisitRequest,
  Invoice,
  LoginRequest,
  LabOrder,
  LedgerEntry,
  LoginResponse,
  ManagerOverview,
  MyAppointment,
  PatientFile,
  PatientSummary,
  PatientVisit,
  PayRequest,
  Prescription,
  RegisterRequest,
  Report,
  RescheduleRequest,
  ResultInput,
  Service,
  ServiceInput,
  Slot,
  StaffAppointment,
  StaffUser,
  TestResult,
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

  listServices: () => http.get<Service[]>("/services").then((r) => r.data),

  listLabOrders: () => http.get<LabOrder[]>("/lab/orders").then((r) => r.data),

  // Numbers go as JSON. Files go as multipart form data, which is how browsers upload files.
  saveResult: (orderId: number, input: ResultInput) => {
    if (input.type === "number") return http.put<null>(`/lab/orders/${orderId}/result`, input).then(() => undefined);
    const form = new FormData();
    form.set("file", input.file);
    return http.put<null>(`/lab/orders/${orderId}/result`, form).then(() => undefined);
  },

  confirmResult: (orderId: number) => http.post<null>(`/lab/orders/${orderId}/confirm`, {}).then(() => undefined),

  myResults: () => http.get<TestResult[]>("/me/results").then((r) => r.data),

  bookingRules: (patientId: number) => http.get<BookingRules>(`/patients/${patientId}/booking-rules`).then((r) => r.data),

  // In the real system this starts the payment gateway. The idempotency key stops double charges.
  payOnline: (appointmentId: number, body: PayRequest) =>
    http.post<null>(`/appointments/${appointmentId}/pay-online`, body).then(() => undefined),

  payCash: (appointmentId: number, body: PayRequest) =>
    http.post<null>(`/appointments/${appointmentId}/pay-cash`, body).then(() => undefined),

  todayInvoices: () => http.get<Invoice[]>("/invoices/today").then((r) => r.data),

  markNoShow: (appointmentId: number) => http.post<null>(`/appointments/${appointmentId}/no-show`, {}).then(() => undefined),

  createService: (body: ServiceInput) => http.post<null>("/services", body).then(() => undefined),

  updateService: (serviceId: number, body: ServiceInput) => http.put<null>(`/services/${serviceId}`, body).then(() => undefined),

  listLedger: () => http.get<LedgerEntry[]>("/ledger").then((r) => r.data),

  // There is no delete. A mistake is fixed with an opposite entry that says why.
  reversePayment: (paymentId: number, reason: string) =>
    http.post<null>(`/payments/${paymentId}/reverse`, { reason }).then(() => undefined),

  // month is "YYYY-MM".
  doctorDues: (month: string) => http.get<DoctorDues[]>("/reports/doctor-dues", { params: { month } }).then((r) => r.data),

  report: (month: string) => http.get<Report>("/reports/summary", { params: { month } }).then((r) => r.data),

  myNotifications: () => http.get<AppNotification[]>("/me/notifications").then((r) => r.data),

  readNotifications: () => http.post<null>("/me/notifications/read", {}).then(() => undefined),

  // The manager's charts for the last {days} days, today included.
  analytics: (days: number) => http.get<Analytics>("/manager/analytics", { params: { days } }).then((r) => r.data),

  // Reception and the manager search by name or phone. An empty search lists the latest patients.
  searchPatients: (query: string) => http.get<PatientSummary[]>("/patients", { params: { q: query } }).then((r) => r.data),

  patientFile: (patientId: number) => http.get<PatientFile>(`/patients/${patientId}/file`).then((r) => r.data),

  // The account is removed, but the medical file stays with the clinic.
  deleteMyAccount: (password: string) => http.delete<null>("/me", { data: { password } }).then(() => undefined),
};

export type Api = typeof httpApi;
