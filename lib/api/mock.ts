import { getToken } from "../auth";
import { ApiError } from "./errors";
import type { Api } from "./http";
import type {
  AppointmentStatus,
  AuditAction,
  AuditEntry,
  BranchId,
  Amounts,
  CancelReason,
  ClinicSettings,
  Currency,
  CreateStaffRequest,
  Doctor,
  DoctorVisit,
  InvoiceItem,
  LabResult,
  LabStatus,
  LoginResponse,
  Medicine,
  MyAppointment,
  NotificationType,
  Payment,
  PaymentMethod,
  Relation,
  ResultEdit,
  Role,
  Service,
  Shift,
  StaffAppointment,
  StaffUser,
  User,
  VisitKind,
  WorkDay,
} from "./types";

// All people in this file are fake. Real patient data must never be used here.
export const MOCK_PASSWORD = "password123";

export const MOCK_LOGINS = {
  patient: "07800000005",
  reception: "07800000001",
  doctor: "07800000002",
  pharmacy: "07800000004",
  manager: "07800000006",
  lab: "07800000007",
  accountant: "07800000008",
};

const STORAGE_KEY = "alrahma.mock.v8";

// Tests can freeze the clock by saving a date here. The real API uses the server's clock.
const CLOCK_KEY = "alrahma.mock.now";

// Placeholder values until the client answers. The manager can change them.
const DEFAULT_SETTINGS: ClinicSettings = {
  cancel_hours: 3,
  no_show_limit: 3,
  deposit_amount: 10000,
  prescription_days: 7,
  usd_rate: 1310,
};

const SHIFTS: Record<Shift, { start: string; end: string }> = {
  morning: { start: "09:00", end: "13:00" },
  evening: { start: "16:00", end: "20:00" },
};

// Appointments in these states still take the doctor's time.
const ACTIVE: AppointmentStatus[] = ["booked", "arrived", "in_progress", "done"];

// ---------- dates and times ----------

const pad = (n: number) => String(n).padStart(2, "0");
const now = () => {
  const fixed = localStorage.getItem(CLOCK_KEY);
  return fixed ? new Date(fixed) : new Date();
};
const dateOf = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const today = () => dateOf(now());
const addDays = (date: string, days: number) => {
  const d = new Date(`${date}T00:00:00`);
  d.setDate(d.getDate() + days);
  return dateOf(d);
};
// 0 is Sunday, like JavaScript's Date. In Iraq, Friday (5) is the weekend.
const weekday = (date: string) => new Date(`${date}T00:00:00`).getDay();
const toMinutes = (time: string) => {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
};
const toTime = (minutes: number) => `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
const startOf = (a: { date: string; time: string }) => new Date(`${a.date}T${a.time || "00:00"}:00`);

// ---------- data shapes ----------

type MockDoctor = Doctor & {
  clinic_percent: number;
  service_percent: number;
  days: (WorkDay | null)[];
  absences: string[];
  late: { date: string; minutes: number } | null;
};
type MockUser = User & { password: string };
// relation says who this person is to the account owner. Walk-ins have no account.
type MockPatient = { id: number; name: string; phone: string; account_id: number | null; relation?: Relation };
type MockAppointment = Omit<StaffAppointment, "patient_name"> & {
  arrival_order: number;
  cancel_reason: CancelReason | null;
  idempotency_key?: string;
};
type MockItem = InvoiceItem & { appointment_id: number };
// ref_id links a refund or reversal to the payment it undoes. key stops the same payment twice.
type MockPayment = Payment & { appointment_id: number; ref_id: number | null; key: string };
type MockVisit = {
  id: number;
  patient_id: number;
  doctor_id: number;
  diagnosis: string;
  internal_note: string;
  medicines: Medicine[];
  dispensed: boolean;
};
type MockLabOrder = {
  id: number;
  visit_id: number;
  patient_id: number;
  doctor_id: number;
  service_id: number;
  status: LabStatus;
  result: LabResult | null;
  history: ResultEdit[];
  requested_at: string;
  confirmed_at: string | null;
};
type MockNotification = {
  id: number;
  user_id: number;
  key: string;
  type: NotificationType;
  params: Record<string, string | number>;
  at: string;
  read: boolean;
};

type Db = {
  nextId: number;
  nextArrival: number;
  doctors: MockDoctor[];
  users: MockUser[];
  patients: MockPatient[];
  appointments: MockAppointment[];
  visits: MockVisit[];
  settings: ClinicSettings;
  audit: AuditEntry[];
  notifications: MockNotification[];
  services: Service[];
  labOrders: MockLabOrder[];
  items: MockItem[];
  payments: MockPayment[];
};

const work = (branch: BranchId, shift: Shift): WorkDay => ({ branch, shift });

// Builds a week from Sunday to Saturday.
const week = (sun: WorkDay | null, mon: WorkDay | null, tue: WorkDay | null, wed: WorkDay | null, thu: WorkDay | null, sat: WorkDay | null) => [
  sun, mon, tue, wed, thu, null, sat,
];

function seed(): Db {
  const day = today();
  return {
    nextId: 100,
    nextArrival: 2,
    doctors: [
      {
        id: 1,
        name: "Dr. Ali Hassan",
        name_ar: "د. علي حسن",
        specialty: "Internal Medicine",
        specialty_ar: "باطنية",
        fee: 25000,
        new_minutes: 20,
        followup_minutes: 10,
        clinic_percent: 30,
        service_percent: 20,
        // Mornings at the main branch, and Thursday evenings at the second branch.
        days: week(work("main", "morning"), work("main", "morning"), work("main", "morning"), work("main", "morning"), work("second", "evening"), work("main", "morning")),
        absences: [],
        late: null,
      },
      {
        id: 2,
        name: "Dr. Noor Jasim",
        name_ar: "د. نور جاسم",
        specialty: "Pediatrics",
        specialty_ar: "أطفال",
        fee: 20000,
        new_minutes: 15,
        followup_minutes: 10,
        clinic_percent: 25,
        service_percent: 25,
        days: week(work("second", "evening"), work("main", "morning"), work("second", "evening"), work("second", "evening"), work("second", "evening"), work("second", "evening")),
        absences: [],
        late: null,
      },
    ],
    users: [
      { id: 1, name: "سارة موظفة", phone: MOCK_LOGINS.reception, role: "reception", password: MOCK_PASSWORD },
      { id: 2, name: "د. علي حسن", phone: MOCK_LOGINS.doctor, role: "doctor", doctor_id: 1, password: MOCK_PASSWORD },
      { id: 3, name: "د. نور جاسم", phone: "07800000003", role: "doctor", doctor_id: 2, password: MOCK_PASSWORD },
      { id: 4, name: "أحمد الصيدلي", phone: MOCK_LOGINS.pharmacy, role: "pharmacy", password: MOCK_PASSWORD },
      { id: 5, name: "زينب كريم", phone: MOCK_LOGINS.patient, role: "patient", password: MOCK_PASSWORD },
      { id: 6, name: "مدير المجمع", phone: MOCK_LOGINS.manager, role: "manager", password: MOCK_PASSWORD },
      { id: 7, name: "حيدر المختبر", phone: MOCK_LOGINS.lab, role: "lab", password: MOCK_PASSWORD },
      { id: 8, name: "رنا المحاسبة", phone: MOCK_LOGINS.accountant, role: "accountant", password: MOCK_PASSWORD },
    ],
    patients: [
      { id: 1, name: "زينب كريم", phone: MOCK_LOGINS.patient, account_id: 5, relation: "self" },
      { id: 2, name: "مصطفى كريم", phone: "07700000002", account_id: 5, relation: "child" },
      { id: 3, name: "حسن عباس", phone: "07700000003", account_id: null },
      { id: 4, name: "مريم ناصر", phone: "07700000004", account_id: null },
    ],
    appointments: [
      { id: 1, patient_id: 4, doctor_id: 1, date: day, time: "09:00", kind: "new", branch: "main", status: "arrived", emergency: false, arrival_order: 1, cancel_reason: null },
      { id: 2, patient_id: 3, doctor_id: 1, date: day, time: "09:20", kind: "new", branch: "main", status: "booked", emergency: false, arrival_order: 0, cancel_reason: null },
    ],
    visits: [
      {
        id: 1,
        patient_id: 1,
        doctor_id: 1,
        diagnosis: "التهاب لوزتين",
        internal_note: "راجع الحالة بعد أسبوع",
        medicines: [{ name: "Amoxicillin 500mg", dose: "3 / 1", days: 7 }],
        dispensed: true,
      },
      {
        id: 2,
        patient_id: 4,
        doctor_id: 1,
        diagnosis: "نقص فيتامين د",
        internal_note: "",
        medicines: [{ name: "Vitamin D3 5000 IU", dose: "1 / 1", days: 30 }],
        dispensed: false,
      },
    ],
    settings: DEFAULT_SETTINGS,
    audit: [],
    notifications: [],
    services: [
      { id: 1, name: "Blood sugar", name_ar: "سكر الدم", kind: "test", price: 5000, currency: "IQD" },
      { id: 2, name: "Complete blood count", name_ar: "تحليل دم شامل", kind: "test", price: 15000, currency: "IQD" },
      { id: 3, name: "Vitamin D", name_ar: "فيتامين د", kind: "test", price: 25000, currency: "IQD" },
      { id: 4, name: "Chest X-ray", name_ar: "أشعة صدر", kind: "xray", price: 20, currency: "USD" },
      { id: 5, name: "Wound dressing", name_ar: "تضميد جرح", kind: "procedure", price: 10000, currency: "IQD" },
    ],
    labOrders: [],
    items: [
      { id: 50, appointment_id: 1, label: "Visit fee", label_ar: "الكشفية", kind: "visit", price: 25000, currency: "IQD" },
      { id: 51, appointment_id: 2, label: "Visit fee", label_ar: "الكشفية", kind: "visit", price: 25000, currency: "IQD" },
    ],
    payments: [],
  };
}

function read(): Db {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) return JSON.parse(saved) as Db;
  // Save the starting data once, so every tab works on the same copy from the start.
  const db = seed();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  return db;
}

function write(db: Db) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  } catch {
    // The browser's storage is full, usually because of large files.
    fail(413, "file_too_big");
  }
}

export function resetMockData() {
  localStorage.removeItem(STORAGE_KEY);
}

const delay = <T>(value: T) => new Promise<T>((resolve) => setTimeout(() => resolve(value), 150));

function fail(status: number, code?: string): never {
  throw new ApiError(status, "", undefined, undefined, code);
}

function requireUser(db: Db, ...roles: Role[]) {
  const token = getToken();
  const user = db.users.find((u) => token === `mock-token-${u.id}`);
  if (!user) fail(401);
  if (roles.length > 0 && !roles.includes(user.role)) fail(403);
  return user;
}

// Every sensitive action is written here, so the manager can see who did what and when.
function log(db: Db, user: MockUser, action: AuditAction, target: string) {
  // In development React loads each page twice, so skip the same entry within 3 seconds.
  const last = db.audit[0];
  if (last && last.user_name === user.name && last.action === action && last.target === target && Date.now() - Date.parse(last.at) < 3000) return;
  db.audit.unshift({ id: db.nextId++, at: new Date().toISOString(), user_name: user.name, role: user.role, action, target });
}

// Sends a message to the account that owns this patient. The key stops the same message twice.
function notify(db: Db, patientId: number, key: string, type: NotificationType, params: Record<string, string | number>) {
  const userId = db.patients.find((p) => p.id === patientId)?.account_id;
  if (!userId || db.notifications.some((n) => n.key === key)) return;
  db.notifications.unshift({ id: db.nextId++, user_id: userId, key, type, params, at: now().toISOString(), read: false });
}

function findDoctor(db: Db, id: number) {
  const doctor = db.doctors.find((d) => d.id === id);
  if (!doctor) fail(404);
  return doctor;
}

function publicDoctor({ days: _days, absences: _absences, late: _late, clinic_percent: _c, service_percent: _s, ...doctor }: MockDoctor): Doctor {
  return (void _days, void _absences, void _late, void _c, void _s, doctor);
}

const doctorOf = (db: Db, id: number) => publicDoctor(findDoctor(db, id));

function findService(db: Db, id: number) {
  const service = db.services.find((s) => s.id === id);
  if (!service) fail(404);
  return service;
}

function findLabOrder(db: Db, id: number) {
  const order = db.labOrders.find((o) => o.id === id);
  if (!order) fail(404);
  return order;
}

function doctorNameOf(db: Db, id: number) {
  return db.doctors.find((d) => d.id === id)?.name_ar ?? "";
}

// Files are kept as data URLs in the mock. The real backend stores the file and gives a link.
function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function patientName(db: Db, id: number) {
  return db.patients.find((p) => p.id === id)?.name ?? "";
}

function staffView(db: Db, { arrival_order: _order, cancel_reason: _reason, ...a }: MockAppointment): StaffAppointment {
  return (void _order, void _reason, { ...a, patient_name: patientName(db, a.patient_id) });
}

function findAppointment(db: Db, id: number) {
  const appointment = db.appointments.find((a) => a.id === id);
  if (!appointment) fail(404);
  return appointment;
}

function changeAppointment(db: Db, id: number, change: Partial<MockAppointment>) {
  const appointment = findAppointment(db, id);
  Object.assign(appointment, change);
  return appointment;
}

// The doctor's place and shift on a date, or null on a day off or an absence.
function workDayOf(doctor: MockDoctor, date: string) {
  return doctor.absences.includes(date) ? null : doctor.days[weekday(date)];
}

const lengthOf = (doctor: MockDoctor, kind: VisitKind) => (kind === "new" ? doctor.new_minutes : doctor.followup_minutes);

// Every start time in the shift. A time is free when it is in the future and does not overlap another visit.
function slotsFor(db: Db, doctor: MockDoctor, date: string, kind: VisitKind, ignoreId?: number) {
  const day = workDayOf(doctor, date);
  if (!day) return [];
  const length = lengthOf(doctor, kind);
  const busy = db.appointments
    .filter((a) => a.doctor_id === doctor.id && a.date === date && a.time && a.id !== ignoreId && ACTIVE.includes(a.status))
    .map((a) => [toMinutes(a.time), toMinutes(a.time) + lengthOf(doctor, a.kind)]);
  const nowMinutes = date === today() ? now().getHours() * 60 + now().getMinutes() : -1;
  const slots = [];
  for (let m = toMinutes(SHIFTS[day.shift].start); m + length <= toMinutes(SHIFTS[day.shift].end); m += length) {
    const free = m > nowMinutes && !busy.some(([start, end]) => m < end && m + length > start);
    slots.push({ time: toTime(m), available: free });
  }
  return slots;
}

function requireFreeSlot(db: Db, doctor: MockDoctor, date: string, time: string, kind: VisitKind, ignoreId?: number) {
  if (!workDayOf(doctor, date)) fail(409, "day_off");
  if (!slotsFor(db, doctor, date, kind, ignoreId).some((s) => s.time === time && s.available)) fail(409, "slot_taken");
}

// Patients may change a booking only until the cancel window starts.
function canChange(db: Db, a: MockAppointment) {
  return a.status === "booked" && startOf(a).getTime() - now().getTime() > db.settings.cancel_hours * 3_600_000;
}

const queueRank = (a: MockAppointment) => {
  if (a.status === "in_progress") return 0;
  if (a.emergency) return 1;
  return a.time ? 2 : 3;
};

// Order: in the room, emergencies, appointments by time, then walk-ins.
function queueOf(db: Db, doctorId: number) {
  return db.appointments
    .filter((a) => a.doctor_id === doctorId && a.date === today() && (a.status === "arrived" || a.status === "in_progress"))
    .sort((a, b) => {
      const rank = queueRank(a) - queueRank(b);
      if (rank !== 0) return rank;
      return queueRank(a) === 2 ? a.time.localeCompare(b.time) : a.arrival_order - b.arrival_order;
    });
}

function ownedPatientIds(db: Db, user: MockUser) {
  return db.patients.filter((p) => p.account_id === user.id).map((p) => p.id);
}

function requireOwnAppointment(db: Db, user: MockUser, id: number) {
  const appointment = findAppointment(db, id);
  if (!ownedPatientIds(db, user).includes(appointment.patient_id)) fail(403);
  return appointment;
}

// ---------- money ----------

const zero = (): Amounts => ({ IQD: 0, USD: 0 });

// What the bill adds up to, what was paid (refunds and reversals subtract), and what is left.
function moneyOf(db: Db, appointmentId: number) {
  const total = zero();
  const paid = zero();
  for (const item of db.items) if (item.appointment_id === appointmentId) total[item.currency] += item.price;
  for (const p of db.payments) if (p.appointment_id === appointmentId) paid[p.currency] += p.kind === "payment" ? p.amount : -p.amount;
  return { total, paid, balance: { IQD: total.IQD - paid.IQD, USD: total.USD - paid.USD } };
}

function addItem(db: Db, appointmentId: number, item: Omit<InvoiceItem, "id">) {
  db.items.push({ id: db.nextId++, appointment_id: appointmentId, ...item });
}

const visitFee = (doctor: MockDoctor): Omit<InvoiceItem, "id"> => ({
  label: "Visit fee",
  label_ar: "الكشفية",
  kind: "visit",
  price: doctor.fee,
  currency: "IQD",
});

function takePayment(db: Db, user: MockUser, appointmentId: number, amount: number, currency: Currency, method: PaymentMethod, key: string) {
  // The same key again means a second press or a retry after a dropped connection: don't charge twice.
  if (db.payments.some((p) => p.key === key)) return;
  // A patient who didn't come is not charged for the visit.
  if (findAppointment(db, appointmentId).status === "no_show") fail(409, "no_show");
  if (!(amount > 0)) fail(422, "bad_amount");
  if (amount > moneyOf(db, appointmentId).balance[currency]) fail(409, "overpay");
  db.payments.push({
    id: db.nextId++,
    appointment_id: appointmentId,
    amount,
    currency,
    method,
    kind: "payment",
    at: now().toISOString(),
    by: user.name,
    reason: "",
    ref_id: null,
    key,
  });
  log(db, user, method === "cash" ? "payment.cash" : "payment.online", patientName(db, findAppointment(db, appointmentId).patient_id));
}

// Gives back every online payment on this appointment that was not already given back.
function refundOnline(db: Db, user: MockUser, appointmentId: number, reason: string) {
  const undone = (id: number) => db.payments.some((p) => p.ref_id === id);
  for (const p of db.payments.filter((p) => p.appointment_id === appointmentId && p.kind === "payment" && p.method === "online" && !undone(p.id))) {
    db.payments.push({ ...p, id: db.nextId++, kind: "refund", at: now().toISOString(), by: user.name, reason, ref_id: p.id, key: `refund:${p.id}` });
    log(db, user, "payment.refund", patientName(db, p.appointment_id));
  }
}

const noShowsOf = (db: Db, patientId: number) => db.appointments.filter((a) => a.patient_id === patientId && a.status === "no_show").length;

function rulesFor(db: Db, patientId: number) {
  const noShows = noShowsOf(db, patientId);
  return { no_shows: noShows, deposit_required: noShows >= db.settings.no_show_limit, deposit_amount: db.settings.deposit_amount };
}

function invoiceOf(db: Db, a: MockAppointment) {
  return {
    appointment_id: a.id,
    patient_name: patientName(db, a.patient_id),
    doctor_name: doctorNameOf(db, a.doctor_id),
    date: a.date,
    time: a.time,
    status: a.status,
    items: db.items.filter((i) => i.appointment_id === a.id).map(({ appointment_id: _a, ...i }) => (void _a, i)),
    payments: db.payments
      .filter((p) => p.appointment_id === a.id)
      .map(({ appointment_id: _a, ref_id: _r, key: _k, ...p }) => (void _a, void _r, void _k, p)),
    money: moneyOf(db, a.id),
  };
}

// ---------- reports ----------

// Visits that really happened. Cancelled and didn't-come visits earn nothing.
const VISITED: AppointmentStatus[] = ["arrived", "in_progress", "done"];

const inMonth = (date: string, month: string) => date.startsWith(month);

function countBy(items: string[]) {
  const counts = new Map<string, number>();
  for (const item of items) counts.set(item, (counts.get(item) ?? 0) + 1);
  return [...counts.entries()].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count);
}

function sumAmounts(list: { amount: number; currency: Currency }[]) {
  const total = zero();
  for (const x of list) total[x.currency] += x.amount;
  return total;
}

function billedOf(db: Db, ids: Set<number>) {
  return sumAmounts(db.items.filter((i) => ids.has(i.appointment_id)).map((i) => ({ amount: i.price, currency: i.currency })));
}

function collectedOf(db: Db, payments: MockPayment[]) {
  return sumAmounts(payments.map((p) => ({ amount: p.kind === "payment" ? p.amount : -p.amount, currency: p.currency })));
}

function session(user: MockUser): LoginResponse {
  const { password: _password, ...publicUser } = user;
  void _password;
  return { access_token: `mock-token-${user.id}`, refresh_token: `mock-refresh-${user.id}`, user: publicUser };
}

export const mockApi: Api = {
  login: async ({ phone, password }) => {
    const user = read().users.find((u) => u.phone === phone && u.password === password);
    if (!user) fail(401, "invalid_credentials");
    return delay(session(user));
  },

  register: async ({ name, phone, password }) => {
    const db = read();
    if (db.users.some((u) => u.phone === phone)) fail(409, "phone_taken");
    const user: MockUser = { id: db.nextId++, name, phone, role: "patient", password };
    db.users.push(user);
    db.patients.push({ id: db.nextId++, name, phone, account_id: user.id, relation: "self" });
    write(db);
    return delay(session(user));
  },

  logout: () => delay(undefined),

  listDoctors: async () => delay(read().doctors.map(publicDoctor)),

  doctorDays: async (doctorId) => {
    const db = read();
    requireUser(db);
    const doctor = findDoctor(db, doctorId);
    const days = Array.from({ length: 14 }, (_, i) => {
      const date = addDays(today(), i);
      return { date, work: doctor.days[weekday(date)], absent: doctor.absences.includes(date) };
    });
    return delay(days);
  },

  doctorSlots: async (doctorId, date, kind) => {
    const db = read();
    requireUser(db);
    return delay(slotsFor(db, findDoctor(db, doctorId), date, kind));
  },

  myFamily: async () => {
    const db = read();
    const user = requireUser(db, "patient");
    return delay(db.patients.filter((p) => p.account_id === user.id).map(({ id, name, relation }) => ({ id, name, relation: relation ?? "self" })));
  },

  myAppointments: async () => {
    const db = read();
    const user = requireUser(db, "patient");
    const ids = ownedPatientIds(db, user);
    const list = db.appointments
      .filter(
        (a) =>
          ids.includes(a.patient_id) &&
          a.date >= today() &&
          (["booked", "arrived", "in_progress"].includes(a.status) || a.cancel_reason === "doctor_absent"),
      )
      .sort((a, b) => startOf(a).getTime() - startOf(b).getTime())
      .map((a): MyAppointment => {
        const doctor = findDoctor(db, a.doctor_id);
        const position = queueOf(db, a.doctor_id).findIndex((q) => q.id === a.id);
        const late = doctor.late?.date === a.date && a.status !== "cancelled" ? doctor.late.minutes : 0;
        return {
          id: a.id,
          patient_name: patientName(db, a.patient_id),
          doctor: publicDoctor(doctor),
          date: a.date,
          time: a.time,
          kind: a.kind,
          branch: a.branch,
          status: a.status,
          ahead: position === -1 ? null : position,
          can_change: canChange(db, a),
          cancel_reason: a.cancel_reason,
          late_minutes: late,
          money: moneyOf(db, a.id),
        };
      });
    return delay(list);
  },

  myVisits: async () => {
    const db = read();
    const user = requireUser(db, "patient");
    const ids = ownedPatientIds(db, user);
    return delay(
      db.visits
        .filter((v) => ids.includes(v.patient_id))
        .map((v) => ({
          id: v.id,
          patient_name: patientName(db, v.patient_id),
          doctor: doctorOf(db, v.doctor_id),
          diagnosis: v.diagnosis,
          medicines: v.medicines,
        })),
    );
  },

  book: async ({ patient_id, doctor_id, date, time, kind, pay, idempotency_key }) => {
    const db = read();
    const user = requireUser(db, "patient");
    if (!ownedPatientIds(db, user).includes(patient_id)) fail(403);
    // Pressed twice, or sent again after the connection dropped: the booking already exists.
    if (db.appointments.some((a) => a.idempotency_key === idempotency_key)) return delay(undefined);
    const doctor = findDoctor(db, doctor_id);
    requireFreeSlot(db, doctor, date, time, kind);
    if (rulesFor(db, patient_id).deposit_required && pay === "clinic") fail(409, "deposit_required");
    const branch = workDayOf(doctor, date)!.branch;
    const id = db.nextId++;
    db.appointments.push({ id, patient_id, doctor_id, date, time, kind, branch, status: "booked", emergency: false, arrival_order: 0, cancel_reason: null, idempotency_key });
    addItem(db, id, visitFee(doctor));
    if (pay !== "clinic") {
      const amount = pay === "full" ? doctor.fee : Math.min(db.settings.deposit_amount, doctor.fee);
      takePayment(db, user, id, amount, "IQD", "online", `${idempotency_key}:pay`);
    }
    log(db, user, "appointment.book", patientName(db, patient_id));
    write(db);
    return delay(undefined);
  },

  cancelAppointment: async (id) => {
    const db = read();
    const user = requireUser(db, "patient");
    const appointment = requireOwnAppointment(db, user, id);
    if (!canChange(db, appointment)) fail(409, "too_late");
    changeAppointment(db, id, { status: "cancelled", cancel_reason: "patient" });
    // Cancelled in time, so online payments come back.
    refundOnline(db, user, id, "patient_cancel");
    log(db, user, "appointment.cancel", patientName(db, appointment.patient_id));
    write(db);
    return delay(undefined);
  },

  rescheduleAppointment: async (id, { date, time }) => {
    const db = read();
    const user = requireUser(db, "patient");
    const appointment = requireOwnAppointment(db, user, id);
    if (!canChange(db, appointment)) fail(409, "too_late");
    const doctor = findDoctor(db, appointment.doctor_id);
    requireFreeSlot(db, doctor, date, time, appointment.kind, id);
    changeAppointment(db, id, { date, time, branch: workDayOf(doctor, date)!.branch });
    log(db, user, "appointment.reschedule", patientName(db, appointment.patient_id));
    write(db);
    return delay(undefined);
  },

  bookedToday: async () => {
    const db = read();
    requireUser(db, "reception");
    return delay(
      db.appointments
        .filter((a) => a.date === today() && a.status === "booked")
        .sort((a, b) => a.time.localeCompare(b.time))
        .map((a) => staffView(db, a)),
    );
  },

  doctorQueue: async (doctorId) => {
    const db = read();
    const user = requireUser(db, "reception", "doctor");
    if (user.role === "doctor" && user.doctor_id !== doctorId) fail(403);
    return delay(queueOf(db, doctorId).map((a) => staffView(db, a)));
  },

  checkIn: async (id, emergency) => {
    const db = read();
    const user = requireUser(db, "reception");
    const appointment = changeAppointment(db, id, { status: "arrived", emergency, arrival_order: db.nextArrival++ });
    log(db, user, "appointment.checkin", patientName(db, appointment.patient_id));
    write(db);
    return delay(undefined);
  },

  addWalkIn: async ({ name, phone, doctor_id, emergency }) => {
    const db = read();
    const user = requireUser(db, "reception");
    const doctor = findDoctor(db, doctor_id);
    const existing = db.patients.find((p) => p.phone === phone);
    const patient = existing ?? { id: db.nextId++, name, phone, account_id: null };
    if (!existing) db.patients.push(patient);
    db.appointments.push({
      id: db.nextId++,
      patient_id: patient.id,
      doctor_id,
      date: today(),
      time: "",
      kind: "new",
      branch: workDayOf(doctor, today())?.branch ?? "main",
      status: "arrived",
      emergency,
      arrival_order: db.nextArrival++,
      cancel_reason: null,
    });
    addItem(db, db.appointments[db.appointments.length - 1].id, visitFee(doctor));
    log(db, user, "walkin.add", patient.name);
    write(db);
    return delay({ duplicate: Boolean(existing) });
  },

  startVisit: async (id) => {
    const db = read();
    requireUser(db, "doctor");
    changeAppointment(db, id, { status: "in_progress" });
    write(db);
    return delay(undefined);
  },

  patientHistory: async (patientId) => {
    const db = read();
    const user = requireUser(db, "doctor");
    const seesPatient =
      db.appointments.some((a) => a.patient_id === patientId && a.doctor_id === user.doctor_id) ||
      db.visits.some((v) => v.patient_id === patientId && v.doctor_id === user.doctor_id);
    if (!seesPatient) fail(403);
    log(db, user, "file.open", patientName(db, patientId));
    write(db);
    return delay(
      db.visits
        .filter((v) => v.patient_id === patientId)
        .map((v): DoctorVisit => ({
          id: v.id,
          patient_name: patientName(db, v.patient_id),
          doctor: doctorOf(db, v.doctor_id),
          diagnosis: v.diagnosis,
          internal_note: v.internal_note,
          medicines: v.medicines,
          tests: db.labOrders
            .filter((o) => o.visit_id === v.id)
            .map((o) => ({ id: o.id, test: findService(db, o.service_id), status: o.status, result: o.status === "confirmed" ? o.result : null })),
        })),
    );
  },

  finishVisit: async (id, { diagnosis, internal_note, medicines, test_ids, procedure_ids }) => {
    const db = read();
    const user = requireUser(db, "doctor");
    const appointment = changeAppointment(db, id, { status: "done" });
    log(db, user, "visit.finish", patientName(db, appointment.patient_id));
    const visitId = db.nextId++;
    db.visits.unshift({
      id: visitId,
      patient_id: appointment.patient_id,
      doctor_id: appointment.doctor_id,
      diagnosis,
      internal_note,
      medicines,
      dispensed: medicines.length === 0,
    });
    // Tests, X-rays and procedures go on the bill at today's price.
    for (const serviceId of [...test_ids, ...procedure_ids]) {
      const service = findService(db, serviceId);
      addItem(db, id, { label: service.name, label_ar: service.name_ar, kind: service.kind, price: service.price, currency: service.currency });
    }
    for (const serviceId of test_ids) {
      findService(db, serviceId);
      db.labOrders.push({
        id: db.nextId++,
        visit_id: visitId,
        patient_id: appointment.patient_id,
        doctor_id: appointment.doctor_id,
        service_id: serviceId,
        status: "requested",
        result: null,
        history: [],
        requested_at: now().toISOString(),
        confirmed_at: null,
      });
    }
    write(db);
    return delay(undefined);
  },

  listPrescriptions: async () => {
    const db = read();
    requireUser(db, "pharmacy");
    return delay(
      db.visits
        .filter((v) => v.medicines.length > 0)
        .map((v) => ({ id: v.id, patient_name: patientName(db, v.patient_id), medicines: v.medicines, dispensed: v.dispensed })),
    );
  },

  dispense: async (id) => {
    const db = read();
    const user = requireUser(db, "pharmacy");
    const visit = db.visits.find((v) => v.id === id);
    if (!visit) fail(404);
    if (visit.dispensed) fail(409, "already_dispensed");
    visit.dispensed = true;
    log(db, user, "prescription.dispense", patientName(db, visit.patient_id));
    write(db);
    return delay(undefined);
  },

  listStaff: async () => {
    const db = read();
    requireUser(db, "reception", "manager");
    return delay(
      db.users
        .filter((u): u is MockUser & { role: StaffUser["role"] } => u.role !== "patient")
        .map(({ id, name, phone, role }) => ({ id, name, phone, role })),
    );
  },

  createStaff: async ({ name, phone, password, role, doctor }: CreateStaffRequest) => {
    const db = read();
    const creator = requireUser(db, "reception", "manager");
    if (db.users.some((u) => u.phone === phone)) fail(409, "phone_taken");
    const user: MockUser = { id: db.nextId++, name, phone, role, password };
    if (role === "doctor") {
      if (!doctor) fail(422);
      const id = db.nextId++;
      const day = work(doctor.branch, "morning");
      db.doctors.push({
        id,
        name: doctor.name_en,
        name_ar: name,
        specialty: doctor.specialty_en,
        specialty_ar: doctor.specialty_ar,
        fee: doctor.fee,
        new_minutes: 20,
        followup_minutes: 10,
        clinic_percent: 30,
        service_percent: 30,
        // A starting week. The manager changes it from the doctors page.
        days: week(day, day, day, day, day, day),
        absences: [],
        late: null,
      });
      user.doctor_id = id;
    }
    db.users.push(user);
    log(db, creator, "staff.create", name);
    write(db);
    return delay(undefined);
  },

  // Everyone signed in can read the rules, for example the cancel window.
  getSettings: async () => {
    const db = read();
    requireUser(db);
    return delay(db.settings);
  },

  updateSettings: async (settings) => {
    const db = read();
    const user = requireUser(db, "manager");
    db.settings = settings;
    log(db, user, "settings.update", "");
    write(db);
    return delay(db.settings);
  },

  listAudit: async () => {
    const db = read();
    requireUser(db, "manager");
    return delay(db.audit);
  },

  managerOverview: async () => {
    const db = read();
    requireUser(db, "manager");
    const todays = db.appointments.filter((a) => a.date === today() && a.status !== "cancelled");
    return delay({
      appointments_today: todays.length,
      waiting_now: todays.filter((a) => a.status === "arrived").length,
      visits_done_today: todays.filter((a) => a.status === "done").length,
      doctors: db.doctors.length,
      staff: db.users.filter((u) => u.role !== "patient").length,
    });
  },

  listSchedules: async () => {
    const db = read();
    requireUser(db, "manager");
    return delay(
      db.doctors.map((d) => ({
        doctor: publicDoctor(d),
        clinic_percent: d.clinic_percent,
        service_percent: d.service_percent,
        days: d.days,
        absences: d.absences.filter((date) => date >= today()),
        late: d.late?.date === today() ? d.late : null,
      })),
    );
  },

  updateSchedule: async (doctorId, { fee, clinic_percent, service_percent, new_minutes, followup_minutes, days }) => {
    const db = read();
    const user = requireUser(db, "manager");
    const doctor = findDoctor(db, doctorId);
    // A new fee applies to new bookings only. Old visits keep the price they had.
    Object.assign(doctor, { fee, clinic_percent, service_percent, new_minutes, followup_minutes, days });
    log(db, user, "doctor.update", doctor.name_ar);
    write(db);
    return delay(undefined);
  },

  markAbsent: async (doctorId, date) => {
    const db = read();
    const user = requireUser(db, "manager");
    if (date < today()) fail(409, "past_date");
    const doctor = findDoctor(db, doctorId);
    if (!doctor.absences.includes(date)) doctor.absences.push(date);
    const affected = db.appointments.filter((a) => a.doctor_id === doctorId && a.date === date && a.status === "booked");
    for (const a of affected) {
      a.status = "cancelled";
      a.cancel_reason = "doctor_absent";
      // The clinic cancelled, so everything paid online is refunded.
      refundOnline(db, user, a.id, "doctor_absent");
      notify(db, a.patient_id, `absent:${a.id}`, "doctor_absent", { doctor: doctor.name_ar, date, time: a.time });
    }
    log(db, user, "doctor.absent", `${doctor.name_ar} · ${date}`);
    write(db);
    return delay({ cancelled: affected.length });
  },

  markLate: async (doctorId, minutes) => {
    const db = read();
    const user = requireUser(db, "manager", "reception");
    const doctor = findDoctor(db, doctorId);
    doctor.late = { date: today(), minutes };
    const affected = db.appointments.filter(
      (a) => a.doctor_id === doctorId && a.date === today() && (a.status === "booked" || a.status === "arrived"),
    );
    for (const a of affected) {
      notify(db, a.patient_id, `late:${a.id}:${minutes}`, "doctor_late", { doctor: doctor.name_ar, minutes });
    }
    log(db, user, "doctor.late", `${doctor.name_ar} · ${minutes}`);
    write(db);
    return delay({ notified: affected.length });
  },

  listServices: async () => {
    const db = read();
    requireUser(db);
    return delay(db.services);
  },

  listLabOrders: async () => {
    const db = read();
    requireUser(db, "lab");
    return delay(
      db.labOrders
        .slice()
        .reverse()
        .map((o) => ({
          id: o.id,
          patient_name: patientName(db, o.patient_id),
          doctor_name: doctorNameOf(db, o.doctor_id),
          test: findService(db, o.service_id),
          status: o.status,
          result: o.result,
          history: o.history,
          requested_at: o.requested_at,
        })),
    );
  },

  saveResult: async (orderId, input) => {
    const db = read();
    const user = requireUser(db, "lab");
    const order = findLabOrder(db, orderId);
    const result: LabResult =
      input.type === "number"
        ? input
        : { type: "file", file_name: input.file.name, file_type: input.file.type, data_url: await fileToDataUrl(input.file) };
    // A confirmed result can still be corrected, but the old value and who changed it are kept.
    if (order.status === "confirmed" && order.result) {
      order.history.unshift({ at: now().toISOString(), by: user.name, before: order.result });
      log(db, user, "lab.edit", patientName(db, order.patient_id));
    } else {
      order.status = "entered";
      log(db, user, "lab.result", patientName(db, order.patient_id));
    }
    order.result = result;
    write(db);
    return delay(undefined);
  },

  confirmResult: async (orderId) => {
    const db = read();
    const user = requireUser(db, "lab");
    const order = findLabOrder(db, orderId);
    if (order.status !== "entered") fail(409, "nothing_to_confirm");
    order.status = "confirmed";
    order.confirmed_at = now().toISOString();
    notify(db, order.patient_id, `result:${order.id}`, "result_ready", { test: findService(db, order.service_id).name_ar });
    log(db, user, "lab.confirm", patientName(db, order.patient_id));
    write(db);
    return delay(undefined);
  },

  myResults: async () => {
    const db = read();
    const user = requireUser(db, "patient");
    const ids = ownedPatientIds(db, user);
    return delay(
      db.labOrders
        .filter((o) => ids.includes(o.patient_id) && o.status === "confirmed" && o.result)
        .map((o) => ({
          id: o.id,
          patient_name: patientName(db, o.patient_id),
          test: findService(db, o.service_id),
          result: o.result!,
          confirmed_at: o.confirmed_at!,
        })),
    );
  },

  bookingRules: async (patientId) => {
    const db = read();
    const user = requireUser(db, "patient");
    if (!ownedPatientIds(db, user).includes(patientId)) fail(403);
    return delay(rulesFor(db, patientId));
  },

  payOnline: async (appointmentId, { amount, currency, idempotency_key }) => {
    const db = read();
    const user = requireUser(db, "patient");
    const appointment = requireOwnAppointment(db, user, appointmentId);
    if (appointment.status === "cancelled") fail(409, "cancelled");
    takePayment(db, user, appointmentId, amount, currency, "online", idempotency_key);
    write(db);
    return delay(undefined);
  },

  payCash: async (appointmentId, { amount, currency, idempotency_key }) => {
    const db = read();
    const user = requireUser(db, "reception");
    takePayment(db, user, appointmentId, amount, currency, "cash", idempotency_key);
    write(db);
    return delay(undefined);
  },

  todayInvoices: async () => {
    const db = read();
    requireUser(db, "reception");
    return delay(
      db.appointments
        .filter((a) => a.date === today() && a.status !== "cancelled")
        .sort((a, b) => (a.time || "99").localeCompare(b.time || "99"))
        .map((a) => invoiceOf(db, a)),
    );
  },

  markNoShow: async (appointmentId) => {
    const db = read();
    const user = requireUser(db, "reception");
    const appointment = findAppointment(db, appointmentId);
    if (appointment.status !== "booked") fail(409, "not_booked");
    // Only after the appointment time has passed.
    if (startOf(appointment).getTime() > now().getTime()) fail(409, "not_started");
    appointment.status = "no_show";
    log(db, user, "appointment.no_show", patientName(db, appointment.patient_id));
    write(db);
    return delay(undefined);
  },

  createService: async (input) => {
    const db = read();
    const user = requireUser(db, "manager");
    db.services.push({ id: db.nextId++, ...input });
    log(db, user, "service.create", input.name_ar);
    write(db);
    return delay(undefined);
  },

  updateService: async (serviceId, input) => {
    const db = read();
    const user = requireUser(db, "manager");
    // Old bills keep their old prices, because each bill line copied the price when it was added.
    Object.assign(findService(db, serviceId), input);
    log(db, user, "service.update", input.name_ar);
    write(db);
    return delay(undefined);
  },

  listLedger: async () => {
    const db = read();
    requireUser(db, "accountant", "manager");
    const undone = (id: number) => db.payments.some((p) => p.ref_id === id);
    return delay(
      db.payments
        .slice()
        .reverse()
        .map(({ ref_id: _r, key: _k, ...p }) => {
          void _r;
          void _k;
          const appointment = findAppointment(db, p.appointment_id);
          return {
            ...p,
            patient_name: patientName(db, appointment.patient_id),
            doctor_name: doctorNameOf(db, appointment.doctor_id),
            reversible: p.kind === "payment" && !undone(p.id),
          };
        }),
    );
  },

  reversePayment: async (paymentId, reason) => {
    const db = read();
    const user = requireUser(db, "accountant");
    const payment = db.payments.find((p) => p.id === paymentId);
    if (!payment) fail(404);
    if (payment.kind !== "payment" || db.payments.some((p) => p.ref_id === paymentId)) fail(409, "already_reversed");
    // The original stays. A new entry with the opposite effect fixes the mistake.
    db.payments.push({ ...payment, id: db.nextId++, kind: "reversal", at: now().toISOString(), by: user.name, reason, ref_id: paymentId, key: `reverse:${paymentId}` });
    log(db, user, "payment.reverse", `${patientName(db, findAppointment(db, payment.appointment_id).patient_id)} · ${reason}`);
    write(db);
    return delay(undefined);
  },

  doctorDues: async (month) => {
    const db = read();
    requireUser(db, "accountant", "manager");
    return delay(
      db.doctors.map((doctor) => {
        let visits = 0;
        let visitIncome = 0;
        let procedureIncome = 0;
        for (const a of db.appointments.filter((x) => x.doctor_id === doctor.id && inMonth(x.date, month) && VISITED.includes(x.status))) {
          visits++;
          const { total, paid } = moneyOf(db, a.id);
          // Only money actually collected counts. Refunds and reversals lower it by themselves.
          const share = total.IQD > 0 ? Math.max(0, Math.min(1, paid.IQD / total.IQD)) : 0;
          for (const item of db.items.filter((i) => i.appointment_id === a.id && i.currency === "IQD")) {
            if (item.kind === "visit") visitIncome += item.price * share;
            if (item.kind === "procedure") procedureIncome += item.price * share;
          }
        }
        // Tests and X-rays belong to the clinic's lab, so they are not part of the doctor's dues.
        const doctorShare = (visitIncome * (100 - doctor.clinic_percent) + procedureIncome * (100 - doctor.service_percent)) / 100;
        return {
          doctor_id: doctor.id,
          doctor_name: doctor.name_ar,
          visits,
          visit_income: Math.round(visitIncome),
          procedure_income: Math.round(procedureIncome),
          doctor_share: Math.round(doctorShare),
          clinic_share: Math.round(visitIncome + procedureIncome - doctorShare),
        };
      }),
    );
  },

  report: async (month) => {
    const db = read();
    requireUser(db, "accountant", "manager");
    const visited = db.appointments.filter((a) => inMonth(a.date, month) && VISITED.includes(a.status));
    const todays = db.appointments.filter((a) => a.date === today() && VISITED.includes(a.status));
    const monthPayments = db.payments.filter((p) => p.at.slice(0, 7) === month);
    const todayPayments = db.payments.filter((p) => dateOf(new Date(p.at)) === today());
    const noShows = db.appointments.filter((a) => inMonth(a.date, month) && a.status === "no_show");
    return delay({
      month,
      by_day: countBy(visited.map((a) => a.date)).sort((a, b) => a.label.localeCompare(b.label)),
      by_doctor: countBy(visited.map((a) => doctorNameOf(db, a.doctor_id))),
      by_branch: countBy(visited.map((a) => a.branch)),
      top_no_shows: countBy(noShows.map((a) => patientName(db, a.patient_id))).slice(0, 5),
      billed: billedOf(db, new Set(visited.map((a) => a.id))),
      collected: collectedOf(db, monthPayments),
      today_billed: billedOf(db, new Set(todays.map((a) => a.id))),
      today_collected: collectedOf(db, todayPayments),
    });
  },
};
