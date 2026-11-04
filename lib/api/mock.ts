import { getToken } from "../auth";
import { ApiError } from "./errors";
import type { Api } from "./http";
import type {
  Analytics,
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
  PatientFile,
  PatientSummary,
  Payment,
  PaymentMethod,
  Relation,
  ResultEdit,
  Role,
  Service,
  Shift,
  StaffAppointment,
  StaffUser,
  StockExpiry,
  StockItem,
  StockLevel,
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

const STORAGE_KEY = "alrahma.mock.v12";

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
type MockAppointment = Omit<StaffAppointment, "patient_name" | "ticket"> & {
  arrival_order: number;
  // The queue number for the day, counted per doctor. Given when the patient arrives.
  ticket?: number;
  // When the doctor called this patient in. The waiting room screen uses it.
  called_at?: string;
  cancel_reason: CancelReason | null;
  idempotency_key?: string;
};
type MockItem = InvoiceItem & { appointment_id: number };
// ref_id links a refund or reversal to the payment it undoes. key stops the same payment twice.
type MockPayment = Payment & { appointment_id: number; ref_id: number | null; key: string };
type MockVisit = {
  id: number;
  created_at: string;
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
  stock: MockStock[];
};

// The stored item. Level and expiry warnings are worked out when it is sent.
type MockStock = Omit<StockItem, "level" | "expiry">;

// An item expiring within this many days shows a warning.
const EXPIRY_WARNING_DAYS = 30;

const work = (branch: BranchId, shift: Shift): WorkDay => ({ branch, shift });

// Builds a week from Sunday to Saturday.
const week = (sun: WorkDay | null, mon: WorkDay | null, tue: WorkDay | null, wed: WorkDay | null, thu: WorkDay | null, sat: WorkDay | null) => [
  sun, mon, tue, wed, thu, null, sat,
];

function seed(): Db {
  const day = today();
  const db: Db = {
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
      { id: 1, patient_id: 4, doctor_id: 1, date: day, time: "09:00", kind: "new", branch: "main", status: "arrived", emergency: false, arrival_order: 1, cancel_reason: null, ticket: 1 },
      { id: 2, patient_id: 3, doctor_id: 1, date: day, time: "09:20", kind: "new", branch: "main", status: "booked", emergency: false, arrival_order: 0, cancel_reason: null },
    ],
    visits: [
      {
        id: 2,
        created_at: `${day}T08:00:00`,
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
      { id: 50, appointment_id: 1, label: "Visit fee", label_ar: "رسوم الكشف", kind: "visit", price: 25000, currency: "IQD" },
      { id: 51, appointment_id: 2, label: "Visit fee", label_ar: "رسوم الكشف", kind: "visit", price: 25000, currency: "IQD" },
    ],
    payments: [],
    // Fake stock, set up so the demo shows every kind of warning.
    stock: [
      { id: 60, name: "Paracetamol 500mg", unit: "tablet", quantity: 240, low_level: 50, expires_on: addDays(day, 200) },
      { id: 61, name: "Amoxicillin 500mg", unit: "capsule", quantity: 30, low_level: 40, expires_on: addDays(day, 120) },
      { id: 62, name: "Vitamin D3 5000 IU", unit: "capsule", quantity: 0, low_level: 20, expires_on: addDays(day, 300) },
      { id: 63, name: "Omeprazole 20mg", unit: "capsule", quantity: 120, low_level: 30, expires_on: addDays(day, 18) },
      { id: 64, name: "Amlodipine 5mg", unit: "tablet", quantity: 90, low_level: 30, expires_on: addDays(day, 400) },
      { id: 65, name: "Cetirizine 10mg", unit: "tablet", quantity: 60, low_level: 20, expires_on: addDays(day, 150) },
      { id: 66, name: "Ibuprofen 400mg", unit: "tablet", quantity: 45, low_level: 20, expires_on: addDays(day, -3) },
      { id: 67, name: "Cough syrup 100ml", unit: "bottle", quantity: 12, low_level: 5, expires_on: null },
    ],
  };
  addPastMonth(db);
  return db;
}

// ---------- a month of fake history ----------

// More fake patients, so the history and analytics pages have something to show.
const MORE_PATIENTS = ["علي جبار", "فاطمة حسين", "كرار سلمان", "نور الهدى عادل", "عباس فاضل", "سجى محمد", "مرتضى رحيم", "زهراء قاسم", "حيدر صباح", "رقية علي"];

const DIAGNOSES: { diagnosis: string; medicines: Medicine[] }[] = [
  { diagnosis: "نزلة برد", medicines: [{ name: "Paracetamol 500mg", dose: "3 / 1", days: 5 }] },
  { diagnosis: "التهاب لوزتين", medicines: [{ name: "Amoxicillin 500mg", dose: "3 / 1", days: 7 }] },
  { diagnosis: "ارتفاع ضغط الدم", medicines: [{ name: "Amlodipine 5mg", dose: "1 / 1", days: 30 }] },
  { diagnosis: "التهاب معدة", medicines: [{ name: "Omeprazole 20mg", dose: "1 / 1", days: 14 }] },
  { diagnosis: "نقص فيتامين د", medicines: [{ name: "Vitamin D3 5000 IU", dose: "1 / 1", days: 30 }] },
  { diagnosis: "حساسية موسمية", medicines: [{ name: "Cetirizine 10mg", dose: "1 / 1", days: 10 }] },
  { diagnosis: "فحص دوري، لا توجد مشكلة", medicines: [] },
];

// The test's unit and a normal-looking range for a fake number result.
const TEST_VALUES: Record<number, { unit: string; min: number; max: number }> = {
  1: { unit: "mg/dL", min: 80, max: 190 },
  2: { unit: "g/dL", min: 10, max: 16 },
  3: { unit: "ng/mL", min: 8, max: 60 },
};

// The same "random" numbers every time, so everyone gets the same demo data.
function randomFrom(seedNumber: number) {
  let a = seedNumber;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function addPastMonth(db: Db) {
  const random = randomFrom(7);
  const pick = <T>(list: T[]) => list[Math.floor(random() * list.length)];
  let id = 1000;
  for (const [index, name] of MORE_PATIENTS.entries()) {
    db.patients.push({ id: 5 + index, name, phone: `077000001${pad(index)}`, account_id: null });
  }
  const patientIds = db.patients.map((p) => p.id);
  const visits: MockVisit[] = [];

  for (let back = 30; back >= 1; back--) {
    const date = addDays(today(), -back);
    for (const doctor of db.doctors) {
      const day = doctor.days[weekday(date)];
      if (!day) continue;
      let minute = toMinutes(SHIFTS[day.shift].start);
      for (let n = 1 + Math.floor(random() * 3); n > 0; n--) {
        const patientId = pick(patientIds);
        const kind: VisitKind = random() < 0.3 ? "followup" : "new";
        const walkIn = random() < 0.15;
        const time = walkIn ? "" : toTime(minute);
        minute += lengthOf(doctor, kind) + 10 * Math.floor(random() * 3);
        const roll = random();
        // Zainab and her son never miss, so the demo patient never needs a deposit.
        const status: AppointmentStatus = roll < 0.08 ? "cancelled" : roll < 0.16 && patientId > 2 ? "no_show" : "done";
        const appointmentId = id++;
        db.appointments.push({
          id: appointmentId,
          patient_id: patientId,
          doctor_id: doctor.id,
          date,
          time,
          kind,
          branch: day.branch,
          status,
          emergency: walkIn && random() < 0.3,
          arrival_order: 0,
          cancel_reason: status === "cancelled" ? "patient" : null,
        });
        db.items.push({ id: id++, appointment_id: appointmentId, ...visitFee(doctor) });
        if (status !== "done") continue;

        const at = new Date(`${date}T${time || SHIFTS[day.shift].start}:00`);
        const visitId = id++;
        const { diagnosis, medicines } = pick(DIAGNOSES);
        visits.push({ id: visitId, created_at: at.toISOString(), patient_id: patientId, doctor_id: doctor.id, diagnosis, internal_note: "", medicines, dispensed: true });

        const extras: Service[] = [];
        if (random() < 0.25) extras.push(findService(db, 1 + Math.floor(random() * 3)));
        if (random() < 0.1) extras.push(findService(db, 5));
        if (random() < 0.05) extras.push(findService(db, 4));
        for (const service of extras) {
          db.items.push({ id: id++, appointment_id: appointmentId, label: service.name, label_ar: service.name_ar, kind: service.kind, price: service.price, currency: service.currency });
          const range = TEST_VALUES[service.id];
          if (!range) continue;
          db.labOrders.push({
            id: id++,
            visit_id: visitId,
            patient_id: patientId,
            doctor_id: doctor.id,
            service_id: service.id,
            status: "confirmed",
            result: { type: "number", value: Math.round(range.min + random() * (range.max - range.min)), unit: range.unit },
            history: [],
            requested_at: at.toISOString(),
            confirmed_at: new Date(at.getTime() + 3_600_000).toISOString(),
          });
        }

        // Everything was paid in full: online or cash for dinars, cash for dollars.
        const total = zero();
        for (const item of db.items) if (item.appointment_id === appointmentId) total[item.currency] += item.price;
        const method: PaymentMethod = random() < 0.3 ? "online" : "cash";
        for (const currency of ["IQD", "USD"] as Currency[]) {
          if (total[currency] === 0) continue;
          const paymentId = id++;
          db.payments.push({
            id: paymentId,
            appointment_id: appointmentId,
            amount: total[currency],
            currency,
            method: currency === "USD" ? "cash" : method,
            kind: "payment",
            at: new Date(at.getTime() + 1_800_000).toISOString(),
            by: method === "online" && currency === "IQD" ? patientName(db, patientId) : "سارة موظفة",
            reason: "",
            ref_id: null,
            key: `seed:${paymentId}`,
          });
        }
      }
    }
  }
  // Newest first, the same order new visits are added in.
  db.visits = [...db.visits, ...visits].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
  db.nextId = id;
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

// One letter per doctor (A, B, C…) and the day's number, like "A-012".
function ticketLabel(db: Db, a: MockAppointment) {
  if (!a.ticket) return null;
  const letter = String.fromCharCode(65 + Math.max(0, db.doctors.findIndex((d) => d.id === a.doctor_id)));
  return `${letter}-${String(a.ticket).padStart(3, "0")}`;
}

// The next number for this doctor today. Numbers start again from 1 every day.
function issueTicket(db: Db, a: MockAppointment) {
  if (a.ticket) return;
  const used = db.appointments.filter((x) => x.doctor_id === a.doctor_id && x.date === a.date && x.ticket).map((x) => x.ticket!);
  a.ticket = Math.max(0, ...used) + 1;
}

function staffView(db: Db, a: MockAppointment): StaffAppointment {
  return {
    id: a.id,
    patient_id: a.patient_id,
    patient_name: patientName(db, a.patient_id),
    doctor_id: a.doctor_id,
    date: a.date,
    time: a.time,
    kind: a.kind,
    branch: a.branch,
    status: a.status,
    emergency: a.emergency,
    ticket: ticketLabel(db, a),
  };
}

// Calls the first waiting patient in to this doctor, unless someone is already in the room.
function callNextPatient(db: Db, doctorId: number) {
  const queue = queueOf(db, doctorId);
  if (queue.some((a) => a.status === "in_progress")) return null;
  const next = queue.find((a) => a.status === "arrived");
  if (!next) return null;
  next.status = "in_progress";
  next.called_at = now().toISOString();
  return next;
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
  label_ar: "رسوم الكشف",
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

const expiresAt = (db: Db, visit: MockVisit) => new Date(new Date(visit.created_at).getTime() + db.settings.prescription_days * 86_400_000);

const REMINDER_HOURS = 24;

// Messages that depend on time are made when the patient checks. The key makes each one only once.
function makeTimedNotifications(db: Db, user: MockUser) {
  for (const a of db.appointments.filter((x) => ownedPatientIds(db, user).includes(x.patient_id))) {
    const doctor = doctorNameOf(db, a.doctor_id);
    const hoursLeft = (startOf(a).getTime() - now().getTime()) / 3_600_000;
    if (a.status === "booked" && hoursLeft > 0 && hoursLeft <= REMINDER_HOURS) {
      notify(db, a.patient_id, `reminder:${a.id}`, "reminder", { doctor, date: a.date, time: a.time });
    }
    if (a.status === "arrived") {
      const ahead = queueOf(db, a.doctor_id).findIndex((q) => q.id === a.id);
      if (ahead >= 0 && ahead <= 2) notify(db, a.patient_id, `turn:${a.id}`, "turn_near", { doctor, n: ahead });
    }
  }
}

function patientSummary(db: Db, p: MockPatient): PatientSummary {
  const appointments = db.appointments.filter((a) => a.patient_id === p.id);
  const visited = appointments.filter((a) => VISITED.includes(a.status)).map((a) => a.date).sort();
  return {
    id: p.id,
    name: p.name,
    phone: p.phone,
    has_account: p.account_id !== null && p.relation === "self",
    relation: p.account_id !== null ? (p.relation ?? "self") : null,
    appointments: appointments.length,
    visits: db.visits.filter((v) => v.patient_id === p.id).length,
    no_shows: noShowsOf(db, p.id),
    last_visit: visited.at(-1) ?? null,
  };
}

function stockLevel(item: MockStock): StockLevel {
  if (item.quantity <= 0) return "out";
  return item.quantity <= item.low_level ? "low" : "ok";
}

function stockExpiry(item: MockStock): StockExpiry {
  if (!item.expires_on) return "none";
  if (item.expires_on < today()) return "expired";
  return item.expires_on <= addDays(today(), EXPIRY_WARNING_DAYS) ? "soon" : "ok";
}

const stockView = (item: MockStock): StockItem => ({ ...item, level: stockLevel(item), expiry: stockExpiry(item) });

function findStock(db: Db, id: number) {
  const item = db.stock.find((s) => s.id === id);
  if (!item) fail(404);
  return item;
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

  queueScreen: async () => {
    const db = read();
    return delay(
      db.doctors
        // Only doctors who work today. An absent doctor still shows, so patients aren't left waiting.
        .filter((d) => d.days[weekday(today())])
        .map((d) => {
          const queue = queueOf(db, d.id);
          const inRoom = queue.find((a) => a.status === "in_progress");
          const waiting = queue.filter((a) => a.status === "arrived");
          return {
            doctor: publicDoctor(d),
            branch: d.days[weekday(today())]!.branch,
            absent: d.absences.includes(today()),
            late_minutes: d.late?.date === today() ? d.late.minutes : 0,
            now: inRoom ? ticketLabel(db, inRoom) : null,
            called_at: inRoom?.called_at ?? null,
            next: waiting
              .slice(0, 4)
              .map((a) => ticketLabel(db, a))
              .filter((ticket): ticket is string => ticket !== null),
            waiting: waiting.length,
          };
        }),
    );
  },

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
          ticket: ticketLabel(db, a),
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
    issueTicket(db, appointment);
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
    const walkIn = db.appointments[db.appointments.length - 1];
    issueTicket(db, walkIn);
    addItem(db, walkIn.id, visitFee(doctor));
    log(db, user, "walkin.add", patient.name);
    write(db);
    return delay({ duplicate: Boolean(existing) });
  },

  startVisit: async (id) => {
    const db = read();
    requireUser(db, "doctor");
    changeAppointment(db, id, { status: "in_progress", called_at: now().toISOString() });
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
      created_at: now().toISOString(),
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
    // The room is free, so the next patient in line is called straight away.
    const next = callNextPatient(db, appointment.doctor_id);
    write(db);
    return delay({ next_ticket: next ? ticketLabel(db, next) : null });
  },

  listPrescriptions: async () => {
    const db = read();
    requireUser(db, "pharmacy");
    return delay(
      db.visits
        // Old prescriptions that were already given out stay in the patient's file, not on the pharmacy's list.
        .filter((v) => v.medicines.length > 0 && (!v.dispensed || now() <= expiresAt(db, v)))
        .map((v) => {
          const expires = expiresAt(db, v);
          return {
            id: v.id,
            patient_name: patientName(db, v.patient_id),
            medicines: v.medicines,
            dispensed: v.dispensed,
            created_at: v.created_at,
            expires_at: expires.toISOString(),
            expired: !v.dispensed && now() > expires,
          };
        }),
    );
  },

  dispense: async (id, { lines }) => {
    const db = read();
    const user = requireUser(db, "pharmacy");
    const visit = db.visits.find((v) => v.id === id);
    if (!visit) fail(404);
    if (visit.dispensed) fail(409, "already_dispensed");
    if (now() > expiresAt(db, visit)) fail(409, "expired");
    if (lines.length !== visit.medicines.length) fail(422);
    // Check every line first, so a problem with one medicine takes nothing from the shelves.
    const needed = new Map<number, number>();
    for (const line of lines) {
      if (line.stock_id === null) continue;
      if (!(line.quantity > 0)) fail(422, "bad_amount");
      needed.set(line.stock_id, (needed.get(line.stock_id) ?? 0) + line.quantity);
    }
    for (const [stockId, quantity] of needed) {
      const item = findStock(db, stockId);
      if (stockExpiry(item) === "expired") fail(409, "stock_expired");
      if (item.quantity < quantity) fail(409, "out_of_stock");
    }
    for (const [stockId, quantity] of needed) findStock(db, stockId).quantity -= quantity;
    visit.dispensed = true;
    log(db, user, "prescription.dispense", patientName(db, visit.patient_id));
    write(db);
    return delay(undefined);
  },

  // Problems first: out of stock or expired, then low or expiring soon, then the rest by name.
  listStock: async () => {
    const db = read();
    requireUser(db, "pharmacy", "manager");
    const rank = (item: StockItem) => (item.level === "out" || item.expiry === "expired" ? 0 : item.level === "low" || item.expiry === "soon" ? 1 : 2);
    return delay(
      db.stock
        .map(stockView)
        .sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name)),
    );
  },

  createStock: async (input) => {
    const db = read();
    const user = requireUser(db, "pharmacy");
    if (db.stock.some((s) => s.name.toLowerCase() === input.name.trim().toLowerCase())) fail(409, "stock_exists");
    db.stock.push({ id: db.nextId++, ...input, name: input.name.trim() });
    log(db, user, "stock.create", input.name);
    write(db);
    return delay(undefined);
  },

  updateStock: async (id, input) => {
    const db = read();
    const user = requireUser(db, "pharmacy");
    Object.assign(findStock(db, id), input);
    log(db, user, "stock.update", input.name);
    write(db);
    return delay(undefined);
  },

  receiveStock: async (id, { quantity, expires_on }) => {
    const db = read();
    const user = requireUser(db, "pharmacy");
    if (!(quantity > 0)) fail(422, "bad_amount");
    const item = findStock(db, id);
    item.quantity += quantity;
    if (expires_on) item.expires_on = expires_on;
    log(db, user, "stock.receive", `${item.name} · ${quantity}`);
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

  myNotifications: async () => {
    const db = read();
    const user = requireUser(db, "patient");
    makeTimedNotifications(db, user);
    write(db);
    return delay(
      db.notifications
        .filter((n) => n.user_id === user.id)
        .map(({ id, type, params, at, read }) => ({ id, type, params, at, read })),
    );
  },

  readNotifications: async () => {
    const db = read();
    const user = requireUser(db, "patient");
    for (const n of db.notifications) if (n.user_id === user.id) n.read = true;
    write(db);
    return delay(undefined);
  },

  analytics: async (days) => {
    const db = read();
    requireUser(db, "manager");
    const from = addDays(today(), 1 - days);
    const to = today();
    const inRange = (date: string) => date >= from && date <= to;
    const appointments = db.appointments.filter((a) => inRange(a.date));
    const visited = appointments.filter((a) => VISITED.includes(a.status));
    // Payments are counted on the day the money moved, in dinars. Refunds and reversals subtract.
    const payments = db.payments.filter((p) => inRange(dateOf(new Date(p.at))));
    const dinars = (p: MockPayment) => (p.currency !== "IQD" ? 0 : p.kind === "payment" ? p.amount : -p.amount);

    const by_day = Array.from({ length: days }, (_, i) => {
      const date = addDays(from, i);
      const ofDay = appointments.filter((a) => a.date === date);
      const visitedOfDay = ofDay.filter((a) => VISITED.includes(a.status));
      const paidOfDay = payments.filter((p) => dateOf(new Date(p.at)) === date);
      const sum = (list: MockPayment[]) => list.reduce((total, p) => total + dinars(p), 0);
      return {
        date,
        visits: visitedOfDay.length,
        followups: visitedOfDay.filter((a) => a.kind === "followup").length,
        no_shows: ofDay.filter((a) => a.status === "no_show").length,
        cancelled: ofDay.filter((a) => a.status === "cancelled").length,
        collected: sum(paidOfDay),
        cash: sum(paidOfDay.filter((p) => p.method === "cash")),
        online: sum(paidOfDay.filter((p) => p.method === "online")),
      };
    });

    const by_doctor = db.doctors
      .map((d) => ({
        label: d.name_ar,
        visits: visited.filter((a) => a.doctor_id === d.id).length,
        collected: payments.filter((p) => findAppointment(db, p.appointment_id).doctor_id === d.id).reduce((sum, p) => sum + dinars(p), 0),
      }))
      .sort((a, b) => b.visits - a.visits);

    const firstVisit = new Map<number, string>();
    for (const a of db.appointments.filter((x) => VISITED.includes(x.status))) {
      const seen = firstVisit.get(a.patient_id);
      if (!seen || a.date < seen) firstVisit.set(a.patient_id, a.date);
    }

    const result: Analytics = {
      from,
      to,
      totals: {
        appointments: appointments.length,
        visits: visited.length,
        no_shows: appointments.filter((a) => a.status === "no_show").length,
        cancelled: appointments.filter((a) => a.status === "cancelled").length,
        walk_ins: appointments.filter((a) => !a.time).length,
        followups: visited.filter((a) => a.kind === "followup").length,
        new_patients: [...firstVisit.values()].filter(inRange).length,
        collected: collectedOf(db, payments),
      },
      by_day,
      by_doctor,
      by_hour: countBy(appointments.filter((a) => a.time).map((a) => a.time.slice(0, 2))).sort((a, b) => a.label.localeCompare(b.label)),
      by_method: {
        cash: payments.filter((p) => p.method === "cash").reduce((sum, p) => sum + dinars(p), 0),
        online: payments.filter((p) => p.method === "online").reduce((sum, p) => sum + dinars(p), 0),
      },
      top_diagnoses: countBy(
        db.visits.filter((v) => inRange(dateOf(new Date(v.created_at)))).map((v) => v.diagnosis),
      ).slice(0, 5),
    };
    return delay(result);
  },

  searchPatients: async (query) => {
    const db = read();
    requireUser(db, "reception", "manager");
    const q = query.trim().toLowerCase();
    return delay(
      db.patients
        .filter((p) => !q || p.name.toLowerCase().includes(q) || p.phone.includes(q))
        .map((p) => patientSummary(db, p))
        // Patients seen most recently come first. Never-seen patients go last.
        .sort((a, b) => (b.last_visit ?? "").localeCompare(a.last_visit ?? "") || a.name.localeCompare(b.name)),
    );
  },

  patientFile: async (patientId) => {
    const db = read();
    const user = requireUser(db, "reception", "manager");
    const patient = db.patients.find((p) => p.id === patientId);
    if (!patient) fail(404);
    // Opening a medical file is always written in the audit log.
    log(db, user, "file.open", patient.name);
    write(db);
    const appointments = db.appointments
      .filter((a) => a.patient_id === patientId)
      .sort((a, b) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time));
    const total = zero();
    const paid = zero();
    // Cancelled and didn't-come visits are not charged, so they don't count as money owed.
    for (const a of appointments.filter((x) => x.status !== "cancelled" && x.status !== "no_show")) {
      const m = moneyOf(db, a.id);
      for (const c of ["IQD", "USD"] as Currency[]) {
        total[c] += m.total[c];
        paid[c] += m.paid[c];
      }
    }
    const file: PatientFile = {
      patient: patientSummary(db, patient),
      family: db.patients
        .filter((p) => patient.account_id !== null && p.account_id === patient.account_id && p.id !== patient.id)
        .map(({ id, name, relation }) => ({ id, name, relation: relation ?? "self" })),
      appointments: appointments.map((a) => ({
        id: a.id,
        doctor_name: doctorNameOf(db, a.doctor_id),
        date: a.date,
        time: a.time,
        kind: a.kind,
        branch: a.branch,
        status: a.status,
        emergency: a.emergency,
        cancel_reason: a.cancel_reason,
        money: moneyOf(db, a.id),
      })),
      visits: db.visits
        .filter((v) => v.patient_id === patientId)
        .map((v) => ({
          id: v.id,
          created_at: v.created_at,
          doctor_name: doctorNameOf(db, v.doctor_id),
          diagnosis: v.diagnosis,
          medicines: v.medicines,
          dispensed: v.dispensed,
          tests: db.labOrders
            .filter((o) => o.visit_id === v.id)
            .map((o) => ({ id: o.id, test: findService(db, o.service_id), status: o.status, result: o.status === "confirmed" ? o.result : null })),
        })),
      payments: db.payments
        .filter((p) => appointments.some((a) => a.id === p.appointment_id))
        .sort((a, b) => b.at.localeCompare(a.at))
        .map(({ ref_id: _r, key: _k, ...p }) => (void _r, void _k, p)),
      money: { total, paid, balance: { IQD: total.IQD - paid.IQD, USD: total.USD - paid.USD } },
    };
    return delay(file);
  },

  deleteMyAccount: async (password) => {
    const db = read();
    const user = requireUser(db, "patient");
    if (user.password !== password) fail(401, "wrong_password");
    // The login goes away. The people and their medical files stay, now without an account.
    for (const p of db.patients) if (p.account_id === user.id) p.account_id = null;
    db.notifications = db.notifications.filter((n) => n.user_id !== user.id);
    db.users = db.users.filter((u) => u.id !== user.id);
    log(db, user, "account.delete", user.name);
    write(db);
    return delay(undefined);
  },
};
