import { getRefreshToken } from "../auth";
import { http } from "./axios";
import type {
  Analytics,
  AppNotification,
  AuditEntry,
  BookRequest,
  BookResult,
  BookingRules,
  CatalogMedicine,
  CashClosing,
  ClinicSettings,
  CounterSaleRequest,
  CloseShiftRequest,
  CreateStaffRequest,
  Doctor,
  DoctorDay,
  DoctorDues,
  DoctorSchedule,
  DispenseRequest,
  ChangePasswordRequest,
  DoctorVisit,
  Expense,
  ForgotPasswordResult,
  ExpenseInput,
  FamilyInput,
  FamilyMember,
  FinishVisitRequest,
  FinishVisitResult,
  FollowUp,
  Invoice,
  LoginRequest,
  LabOrder,
  LedgerEntry,
  LoginResponse,
  Page,
  PaymentLogEntry,
  PaymentSession,
  PageQuery,
  ManagerOverview,
  MedicalAlerts,
  MyAppointment,
  MyVisit,
  PatientFile,
  PatientSummary,
  PayRequest,
  PharmacySale,
  Prescription,
  RateVisitRequest,
  RegisterRequest,
  Report,
  RescheduleRequest,
  ReceiveStockRequest,
  ResultInput,
  ScreenDoctor,
  Service,
  ServiceInput,
  ShiftSummary,
  Slot,
  StaffAppointment,
  StaffBookRequest,
  StaffBookResult,
  StaffUser,
  StockInput,
  StockMove,
  StockItem,
  TestResult,
  UpdateScheduleRequest,
  VisitRating,
  Vitals,
  VitalsRecord,
  VisitKind,
  ResetPasswordRequest,
  StartPaymentRequest,
  WelfareRequest,
  WelfareReview,
  WelfareStatus,
  WelfareSubmit,
  UpdateStaffRequest,
  WalkInRequest,
  WalkInResult,
} from "./types";

// ---------- answers from a backend that is one step behind ----------
// The front end sometimes gets new fields before the backend sends them. Instead of crashing (or showing
// "NaN IQD"), a missing field gets a safe value here, in one place. Once the backend sends the field, these do nothing.

const withBookingRules = (r: BookingRules): BookingRules => ({ ...r, welfare_percent: r.welfare_percent ?? 0 });

const withSettings = (s: ClinicSettings): ClinicSettings => ({ ...s, welfare_discount_percent: s.welfare_discount_percent ?? 0 });

// An older backend answers a booking with nothing. The booking was still made; there's just no online payment to open.
const withBookResult = (r: BookResult | null | undefined): BookResult => ({ appointment_id: r?.appointment_id ?? 0, payment: r?.payment ?? null });

const withPayBy = (list: MyAppointment[]) => list.map((a) => ({ ...a, pay_by: a.pay_by ?? null }));

// Without payment_log, the history is built from the plain payments list (no failed online attempts in that case).
function withPatientFile(f: PatientFile): PatientFile {
  const visitOf = (id: number) => f.appointments.find((a) => a.id === id);
  return {
    ...f,
    welfare: f.welfare ?? null,
    payment_log:
      f.payment_log ??
      (f.payments ?? []).map((p) => ({
        id: `payment-${p.id}`,
        kind: p.kind,
        status: null,
        at: p.at,
        amount: p.amount,
        currency: p.currency,
        method: p.method,
        receipt_no: p.id,
        by: p.by,
        reason: p.reason,
        appointment_id: p.appointment_id,
        patient_name: f.patient.name,
        doctor_name: visitOf(p.appointment_id)?.doctor_name ?? "",
        appointment_date: visitOf(p.appointment_id)?.date ?? "",
        appointment_time: visitOf(p.appointment_id)?.time ?? "",
      })),
  };
}

export const httpApi = {
  login: (body: LoginRequest) => http.post<LoginResponse>("/auth/login", body).then((r) => r.data),

  register: (body: RegisterRequest) => http.post<LoginResponse>("/auth/register", body).then((r) => r.data),

  // Forgot password: send a code to the phone, then set a new password with that code. No sign-in needed.
  forgotPassword: (phone: string) => http.post<ForgotPasswordResult>("/auth/password/forgot", { phone }).then((r) => r.data),

  resetPassword: (body: ResetPasswordRequest) => http.post<null>("/auth/password/reset", body).then(() => undefined),

  // Signed in: change the password. A wrong current password answers 422 (not 401), so it doesn't sign the person out.
  changePassword: (body: ChangePasswordRequest) => http.post<null>("/auth/password/change", body).then(() => undefined),

  logout: () => {
    const refresh_token = getRefreshToken();
    if (!refresh_token) return Promise.resolve();
    return http.post<null>("/auth/logout", { refresh_token }).then(
      () => undefined,
      () => undefined,
    );
  },

  listDoctors: () => http.get<Doctor[]>("/public/doctors").then((r) => r.data),

  // For the waiting room TV. Public: no sign-in, and no patient names.
  queueScreen: () => http.get<ScreenDoctor[]>("/public/queue-screen").then((r) => r.data),

  doctorDays: (doctorId: number) => http.get<DoctorDay[]>(`/doctors/${doctorId}/days`).then((r) => r.data),

  doctorSlots: (doctorId: number, date: string, kind: VisitKind) =>
    http.get<Slot[]>(`/doctors/${doctorId}/slots`, { params: { date, kind } }).then((r) => r.data),

  myFamily: () => http.get<FamilyMember[]>("/me/family").then((r) => r.data),

  addFamilyMember: (body: FamilyInput) => http.post<null>("/me/family", body).then(() => undefined),

  updateFamilyMember: (id: number, body: FamilyInput) => http.put<null>(`/me/family/${id}`, body).then(() => undefined),

  // Takes the person off the account. Their medical file stays with the clinic.
  removeFamilyMember: (id: number) => http.delete<null>(`/me/family/${id}`).then(() => undefined),

  myAppointments: () => http.get<MyAppointment[]>("/me/appointments").then((r) => withPayBy(r.data)),

  // Follow-ups doctors asked for that aren't booked yet, for everyone on the account.
  myFollowUps: () => http.get<FollowUp[]>("/me/follow-ups").then((r) => r.data),

  myVisits: () => http.get<MyVisit[]>("/me/visits").then((r) => r.data),

  // Once per visit. The answer is the saved rating.
  rateVisit: (visitId: number, body: RateVisitRequest) => http.post<VisitRating>(`/me/visits/${visitId}/rating`, body).then((r) => r.data),

  // Paying online: the answer has the payment to finish on the gateway's page (payment.form_url).
  book: (body: BookRequest) => http.post<BookResult | null>("/appointments", body).then((r) => withBookResult(r.data)),

  cancelAppointment: (id: number) => http.post<null>(`/appointments/${id}/cancel`, {}).then(() => undefined),

  rescheduleAppointment: (id: number, body: RescheduleRequest) =>
    http.post<null>(`/appointments/${id}/reschedule`, body).then(() => undefined),

  // Reception books on behalf of a caller. The answer says which patient file it was booked on.
  staffBook: (body: StaffBookRequest) => http.post<StaffBookResult>("/appointments/by-staff", body).then((r) => r.data),

  bookedToday: () => http.get<StaffAppointment[]>("/appointments/booked-today").then((r) => r.data),

  doctorQueue: (doctorId: number) =>
    http.get<StaffAppointment[]>(`/doctors/${doctorId}/queue`).then((r) => r.data),

  // idempotency_key: sending the same check-in twice must not move the patient to the back of the line.
  checkIn: (id: number, emergency: boolean, idempotency_key: string) =>
    http.post<null>(`/appointments/${id}/check-in`, { emergency, idempotency_key }).then(() => undefined),

  addWalkIn: (body: WalkInRequest) => http.post<WalkInResult>("/walk-ins", body).then((r) => r.data),

  startVisit: (id: number) => http.post<null>(`/appointments/${id}/start`, {}).then(() => undefined),

  // Allergies, chronic diseases and blood type. The doctor, reception and the manager can read them.
  patientAlerts: (patientId: number) => http.get<MedicalAlerts>(`/patients/${patientId}/alerts`).then((r) => r.data),

  // Only the doctor writes them.
  updatePatientAlerts: (patientId: number, body: MedicalAlerts) =>
    http.put<MedicalAlerts>(`/patients/${patientId}/alerts`, body).then((r) => r.data),

  // Saves this visit's measurements. Saving again replaces them (a corrected reading).
  saveVitals: (appointmentId: number, body: Vitals) =>
    http.put<VitalsRecord>(`/appointments/${appointmentId}/vitals`, body).then((r) => r.data),

  // Every measurement of this patient, newest first.
  patientVitals: (patientId: number) => http.get<VitalsRecord[]>(`/patients/${patientId}/vitals`).then((r) => r.data),

  patientHistory: (patientId: number) =>
    http.get<DoctorVisit[]>(`/patients/${patientId}/visits`).then((r) => r.data),

  // Answers with the ticket of the next patient called in, or null when nobody is waiting.
  finishVisit: (id: number, body: FinishVisitRequest) =>
    http.post<FinishVisitResult>(`/appointments/${id}/finish`, body).then((r) => r.data),

  listPrescriptions: () => http.get<Prescription[]>("/prescriptions").then((r) => r.data),

  // Takes the dispensed amounts out of the pharmacy's stock and records what the patient paid for them.
  dispense: (id: number, body: DispenseRequest) => http.post<PharmacySale | null>(`/prescriptions/${id}/dispense`, body).then((r) => r.data),

  // A sale without a prescription.
  sellOverCounter: (body: CounterSaleRequest) => http.post<PharmacySale>("/pharmacy/sales", body).then((r) => r.data),

  // The sales of one day ("YYYY-MM-DD"), newest first.
  listSales: (date: string) => http.get<PharmacySale[]>("/pharmacy/sales", { params: { date } }).then((r) => r.data),

  listStock: () => http.get<StockItem[]>("/pharmacy/stock").then((r) => r.data),

  // The medicines on the pharmacy's shelves, for the doctor's medicine search.
  medicineCatalog: () => http.get<CatalogMedicine[]>("/pharmacy/catalog").then((r) => r.data),

  createStock: (body: StockInput) => http.post<null>("/pharmacy/stock", body).then(() => undefined),

  updateStock: (id: number, body: StockInput) => http.put<null>(`/pharmacy/stock/${id}`, body).then(() => undefined),

  receiveStock: (id: number, body: ReceiveStockRequest) => http.post<null>(`/pharmacy/stock/${id}/receive`, body).then(() => undefined),

  // The latest changes to the stock, newest first.
  stockLog: (limit: number) => http.get<StockMove[]>("/pharmacy/stock/log", { params: { limit } }).then((r) => r.data),

  listStaff: () => http.get<StaffUser[]>("/users").then((r) => r.data),

  createStaff: (body: CreateStaffRequest) => http.post<null>("/users", body).then(() => undefined),

  // Manager only.
  updateStaff: (id: number, body: UpdateStaffRequest) => http.patch<null>(`/users/${id}`, body).then(() => undefined),

  // Stop or restart an account (manager only). A stopped account is signed out and can't sign in again.
  setStaffActive: (id: number, active: boolean) => http.post<null>(`/users/${id}/${active ? "enable" : "disable"}`).then(() => undefined),

  getSettings: () => http.get<ClinicSettings>("/settings").then((r) => withSettings(r.data)),

  updateSettings: (body: ClinicSettings) => http.put<ClinicSettings>("/settings", body).then((r) => r.data),

  // Newest first. `action` keeps only one kind of action.
  listAudit: (q: PageQuery & { action?: string }) => http.get<Page<AuditEntry>>("/audit", { params: q }).then((r) => r.data),

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
    if (input.type === "values") return http.put<null>(`/lab/orders/${orderId}/result`, input).then(() => undefined);
    const form = new FormData();
    form.set("file", input.file);
    form.set("note", input.note);
    return http.put<null>(`/lab/orders/${orderId}/result`, form).then(() => undefined);
  },

  confirmResult: (orderId: number) => http.post<null>(`/lab/orders/${orderId}/confirm`, {}).then(() => undefined),

  myResults: () => http.get<TestResult[]>("/me/results").then((r) => r.data),

  bookingRules: (patientId: number) => http.get<BookingRules>(`/patients/${patientId}/booking-rules`).then((r) => withBookingRules(r.data)),

  // In the real system this starts the payment gateway. The idempotency key stops double charges.
  // Online payment of what's left on an appointment. Nothing is paid yet: the patient finishes on form_url.
  startPayment: (appointmentId: number, body: StartPaymentRequest) =>
    http.post<PaymentSession>(`/appointments/${appointmentId}/payments`, body).then((r) => r.data),

  // ---------- social welfare ----------

  // The latest request of each family member.
  myWelfare: () => http.get<WelfareRequest[]>("/me/welfare").then((r) => r.data),

  // Sends the card number and a photo of the card. The photo goes as a file (multipart), not as JSON.
  submitWelfare: (patientId: number, { card_number, photo }: WelfareSubmit) => {
    const form = new FormData();
    form.append("card_number", card_number);
    form.append("photo", photo);
    return http.post<WelfareRequest>(`/patients/${patientId}/welfare`, form).then((r) => r.data);
  },

  // Reception and the manager: requests by status, newest first.
  listWelfare: (status: WelfareStatus) => http.get<WelfareRequest[]>("/welfare", { params: { status } }).then((r) => r.data),

  reviewWelfare: (id: number, body: WelfareReview) => http.post<WelfareRequest>(`/welfare/${id}/review`, body).then((r) => r.data),

  // Every payment, refund and online attempt for the patient and their family, newest first.
  // patient_id keeps only one person's.
  myPayments: (q: PageQuery & { patient_id?: number }) => http.get<Page<PaymentLogEntry>>("/me/payments", { params: q }).then((r) => r.data),

  // The result, as the server knows it from the gateway (its signed notification, then a status check).
  paymentStatus: (paymentId: string) => http.get<PaymentSession>(`/payments/${paymentId}`).then((r) => r.data),

  payCash: (appointmentId: number, body: PayRequest) =>
    http.post<null>(`/appointments/${appointmentId}/pay-cash`, body).then(() => undefined),

  todayInvoices: () => http.get<Invoice[]>("/invoices/today").then((r) => r.data),

  markNoShow: (appointmentId: number) => http.post<null>(`/appointments/${appointmentId}/no-show`, {}).then(() => undefined),

  createService: (body: ServiceInput) => http.post<null>("/services", body).then(() => undefined),

  updateService: (serviceId: number, body: ServiceInput) => http.put<null>(`/services/${serviceId}`, body).then(() => undefined),

  // The receptionist's own open shift: cash taken since their last closing.
  shiftSummary: () => http.get<ShiftSummary>("/cash/shift").then((r) => r.data),

  closeShift: (body: CloseShiftRequest) => http.post<CashClosing>("/cash/closings", body).then((r) => r.data),

  // Reception sees its own closings; the accountant and the manager see everyone's.
  listClosings: () => http.get<CashClosing[]>("/cash/closings").then((r) => r.data),

  // A month's expenses ("YYYY-MM"), newest first, voided ones included so the history is complete.
  listExpenses: (month: string) => http.get<Expense[]>("/expenses", { params: { month } }).then((r) => r.data),

  addExpense: (body: ExpenseInput) => http.post<Expense>("/expenses", body).then((r) => r.data),

  voidExpense: (id: number, reason: string) => http.post<Expense>(`/expenses/${id}/void`, { reason }).then((r) => r.data),

  // Newest first.
  listLedger: (q: PageQuery) => http.get<Page<LedgerEntry>>("/ledger", { params: q }).then((r) => r.data),

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
  searchPatients: (query: string, q: PageQuery) =>
    http.get<Page<PatientSummary>>("/patients", { params: { q: query, ...q } }).then((r) => r.data),

  patientFile: (patientId: number) => http.get<PatientFile>(`/patients/${patientId}/file`).then((r) => withPatientFile(r.data)),

  // The account is removed, but the medical file stays with the clinic.
  deleteMyAccount: (password: string) => http.delete<null>("/me", { data: { password } }).then(() => undefined),
};

export type Api = typeof httpApi;
