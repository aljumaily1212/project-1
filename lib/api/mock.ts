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
  CashClosing,
  ClinicSettings,
  Currency,
  CreateStaffRequest,
  Doctor,
  DoctorVisit,
  Expense,
  ExpenseCategory,
  InvoiceItem,
  LabResult,
  LabStatus,
  LoginResponse,
  PageQuery,
  PaymentStatus,
  PaymentLogEntry,
  PaymentSession,
  WelfareRequest,
  MedicalAlerts,
  Medicine,
  MyAppointment,
  NotificationType,
  PatientFile,
  PatientSummary,
  Payment,
  PaymentMethod,
  PharmacySale,
  SaleLine,
  Relation,
  ResultEdit,
  ResultTemplateRow,
  Role,
  Service,
  Shift,
  StaffAppointment,
  StaffUser,
  StockExpiry,
  StockItem,
  StockLevel,
  StockMove,
  StockMoveKind,
  User,
  VitalsRecord,
  VisitKind,
  VisitRating,
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

const STORAGE_KEY = "alrahma.mock.v20";

// Tests can freeze the clock by saving a date here. The real API uses the server's clock.
const CLOCK_KEY = "alrahma.mock.now";

// Placeholder values until the client answers. The manager can change them.
const DEFAULT_SETTINGS: ClinicSettings = {
  cancel_hours: 3,
  no_show_limit: 3,
  deposit_amount: 10000,
  prescription_days: 7,
  usd_rate: 1310,
  welfare_discount_percent: 25,
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
type MockUser = User & { password: string; disabled?: boolean };
// relation says who this person is to the account owner. Walk-ins have no account.
// A family member added by a patient may have no phone of their own (""), and no known birth date.
// alerts is missing on files saved before allergies existed; alertsOf() treats that as "nothing recorded".
type MockPatient = {
  id: number;
  name: string;
  phone: string;
  account_id: number | null;
  relation?: Relation;
  birth_date?: string | null;
  alerts?: MedicalAlerts;
};
type MockAppointment = Omit<StaffAppointment, "patient_name" | "ticket" | "has_vitals"> & {
  arrival_order: number;
  // The queue number for the day, counted per doctor. Given when the patient arrives.
  ticket?: number;
  // When the doctor called this patient in. The waiting room screen uses it.
  called_at?: string;
  cancel_reason: CancelReason | null;
  idempotency_key?: string;
  checkin_key?: string;
  // A deposit that must be paid online by this time, or the appointment is cancelled.
  pay_by?: string | null;
  vitals?: Omit<VitalsRecord, "appointment_id">;
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
  rating?: VisitRating;
  follow_up_on?: string;
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
  // Newest first.
  stockLog: StockMove[];
  // Newest first.
  closings: CashClosing[];
  sales: PharmacySale[];
  expenses: Expense[];
  resetCodes: ResetCode[];
  paymentSessions: MockPaymentSession[];
  welfare: MockWelfare[];
};

type MockWelfare = Omit<WelfareRequest, "patient_name" | "patient_phone">;

// An online payment waiting on the (demo) gateway. `outcome` is what the gateway page decided; it becomes the
// status a moment later (`settles_at`), the way a real gateway's notification reaches the server after the redirect.
type MockPaymentSession = {
  id: string;
  appointment_id: number;
  user_id: number;
  amount: number;
  status: PaymentStatus;
  created_at: string;
  key: string;
  return_url: string;
  outcome?: PaymentStatus;
  settles_at?: number;
};
// How long a patient who must pay a deposit has to pay, before the slot is freed.
const PAY_BY_MINUTES = 15;

// A "forgot password" code waiting to be used. Wrong tries are counted, so nobody can guess all 1,000,000 codes.
type ResetCode = { phone: string; code: string; expires: number; tries: number };
const RESET_MINUTES = 10;
const RESET_TRIES = 5;

// The stored item. Level and expiry warnings are worked out when it is sent.
type MockStock = Omit<StockItem, "level" | "expiry" | "price"> & { price?: number };

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
      {
        id: 4,
        name: "مريم ناصر",
        phone: "07700000004",
        account_id: null,
        alerts: { allergies: ["Aspirin", "Ibuprofen"], conditions: ["ارتفاع ضغط الدم"], blood_type: "O+" },
      },
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
      {
        id: 1,
        name: "Blood sugar",
        name_ar: "سكر الدم",
        kind: "test",
        price: 5000,
        currency: "IQD",
        template: [{ name: "Fasting glucose", unit: "mg/dL", ref_low: 70, ref_high: 110 }],
      },
      {
        id: 2,
        name: "Complete blood count",
        name_ar: "تحليل دم شامل",
        kind: "test",
        price: 15000,
        currency: "IQD",
        template: [
          { name: "Hemoglobin (Hb)", unit: "g/dL", ref_low: 12, ref_high: 17 },
          { name: "White cells (WBC)", unit: "10³/µL", ref_low: 4, ref_high: 11 },
          { name: "Red cells (RBC)", unit: "10⁶/µL", ref_low: 4.2, ref_high: 5.9 },
          { name: "Platelets (PLT)", unit: "10³/µL", ref_low: 150, ref_high: 450 },
        ],
      },
      {
        id: 3,
        name: "Vitamin D",
        name_ar: "فيتامين د",
        kind: "test",
        price: 25000,
        currency: "IQD",
        template: [{ name: "25-OH Vitamin D", unit: "ng/mL", ref_low: 30, ref_high: 100 }],
      },
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
      { id: 60, name: "Paracetamol 500mg", unit: "tablet", price: 250, quantity: 240, low_level: 50, expires_on: addDays(day, 200), barcode: "06290000000011" },
      { id: 61, name: "Amoxicillin 500mg", unit: "capsule", price: 500, quantity: 30, low_level: 40, expires_on: addDays(day, 120), barcode: "06290000000028" },
      { id: 62, name: "Vitamin D3 5000 IU", unit: "capsule", price: 750, quantity: 0, low_level: 20, expires_on: addDays(day, 300), barcode: null },
      { id: 63, name: "Omeprazole 20mg", unit: "capsule", price: 400, quantity: 120, low_level: 30, expires_on: addDays(day, 18), barcode: "06290000000035" },
      { id: 64, name: "Amlodipine 5mg", unit: "tablet", price: 300, quantity: 90, low_level: 30, expires_on: addDays(day, 400), barcode: null },
      { id: 65, name: "Cetirizine 10mg", unit: "tablet", price: 250, quantity: 60, low_level: 20, expires_on: addDays(day, 150), barcode: null },
      { id: 66, name: "Ibuprofen 400mg", unit: "tablet", price: 250, quantity: 45, low_level: 20, expires_on: addDays(day, -3), barcode: null },
      { id: 67, name: "Cough syrup 100ml", unit: "bottle", price: 3000, quantity: 12, low_level: 5, expires_on: null, barcode: null },
    ],
    stockLog: [],
    closings: [],
    sales: [],
    expenses: fakeExpenses(day),
    resetCodes: [],
    paymentSessions: [],
    welfare: [],
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

// Normal-looking measurements, with now and then a high blood pressure or a fever.
function fakeVitals(random: () => number, at: Date): Omit<VitalsRecord, "appointment_id"> {
  const between = (low: number, high: number, step = 1) => Math.round((low + random() * (high - low)) / step) * step;
  const pressureHigh = random() < 0.2;
  return {
    systolic: pressureHigh ? between(140, 165) : between(105, 130),
    diastolic: pressureHigh ? between(90, 100) : between(65, 85),
    temperature: random() < 0.15 ? between(37.6, 38.8, 0.1) : between(36.4, 37.2, 0.1),
    pulse: between(62, 98),
    spo2: between(95, 99),
    weight: between(55, 95),
    height: between(155, 185),
    at: new Date(at.getTime() - 900_000).toISOString(),
    by: "سارة موظفة",
  };
}

// A believable month of running costs, this month and last, so the profit report has something to show.
function fakeExpenses(day: string): Expense[] {
  const list: [number, ExpenseCategory, number, string][] = [
    [-34, "rent", 2_000_000, "إيجار البناية"],
    [-33, "salaries", 6_500_000, "رواتب الموظفين"],
    [-25, "power", 450_000, "اشتراك المولدة"],
    [-18, "supplies", 380_000, "قفازات وكمامات وشاش"],
    [-4, "rent", 2_000_000, "إيجار البناية"],
    [-3, "salaries", 6_500_000, "رواتب الموظفين"],
    [-2, "power", 480_000, "اشتراك المولدة"],
    [-1, "medicines", 1_250_000, "شراء أدوية من المذخر"],
  ];
  return list
    .map(([back, category, amount, note], i) => ({
      id: 900 + i,
      date: addDays(day, back),
      category,
      amount,
      currency: "IQD" as const,
      note,
      by: "رنا المحاسبة",
      at: `${addDays(day, back)}T10:00:00`,
      voided: null,
    }))
    .reverse();
}

// Fake comments for the fake ratings.
const GOOD_COMMENTS = ["الطبيب متعاون جداً وشرح الحالة بوضوح", "خدمة ممتازة والانتظار قصير", "شكراً لكم، تعامل راقٍ", "المكان نظيف والموظفون لطفاء"];
const BAD_COMMENTS = ["الانتظار كان طويلاً", "لم يُشرح لي الدواء بشكل كافٍ"];

// A fake value near the normal range: usually inside it, sometimes a little above or below.
function fakeValue(row: ResultTemplateRow, random: () => number) {
  const low = row.ref_low ?? 0;
  const high = row.ref_high ?? low * 2 + 10;
  const value = low * 0.8 + random() * (high * 1.2 - low * 0.8);
  return Math.round(value * 10) / 10;
}

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
        if (random() < 0.7) db.appointments[db.appointments.length - 1].vitals = fakeVitals(random, at);
        const visitId = id++;
        const { diagnosis, medicines } = pick(DIAGNOSES);
        // About half the patients rated their visit, mostly well, a few not.
        const rated = random() < 0.5;
        const stars = rated ? pick([5, 5, 5, 4, 4, 4, 3, 2]) : 0;
        const rating = rated
          ? { stars, comment: random() < 0.4 ? pick(stars >= 4 ? GOOD_COMMENTS : BAD_COMMENTS) : "", at: new Date(at.getTime() + 7_200_000).toISOString() }
          : undefined;
        visits.push({ id: visitId, created_at: at.toISOString(), patient_id: patientId, doctor_id: doctor.id, diagnosis, internal_note: "", medicines, dispensed: true, rating });

        const extras: Service[] = [];
        if (random() < 0.25) extras.push(findService(db, 1 + Math.floor(random() * 3)));
        if (random() < 0.1) extras.push(findService(db, 5));
        if (random() < 0.05) extras.push(findService(db, 4));
        for (const service of extras) {
          db.items.push({ id: id++, appointment_id: appointmentId, label: service.name, label_ar: service.name_ar, kind: service.kind, price: service.price, currency: service.currency });
          if (!service.template) continue;
          db.labOrders.push({
            id: id++,
            visit_id: visitId,
            patient_id: patientId,
            doctor_id: doctor.id,
            service_id: service.id,
            status: "confirmed",
            result: { type: "values", rows: service.template.map((row) => ({ ...row, value: fakeValue(row, random) })), sample: "blood", note: "" },
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
  if (saved) {
    const db = JSON.parse(saved) as Db;
    // Data saved before the stock log existed starts with an empty log, instead of losing everything.
    db.stockLog ??= [];
    db.closings ??= [];
    db.sales ??= [];
    db.expenses ??= [];
    db.resetCodes ??= [];
    db.paymentSessions ??= [];
    db.welfare ??= [];
    db.settings.welfare_discount_percent ??= DEFAULT_SETTINGS.welfare_discount_percent;
    expireUnpaid(db);
    return db;
  }
  // Save the starting data once, so every tab works on the same copy from the start.
  const db = seed();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  return db;
}

// Deposits not paid in time: the appointment is cancelled and the slot is free again.
// Checked whenever the data is read, so it happens without a timer.
function expireUnpaid(db: Db) {
  const nowIso = now().toISOString();
  for (const a of db.appointments) {
    if (a.status !== "booked" || !a.pay_by || a.pay_by > nowIso) continue;
    const paid = db.payments.some((p) => p.appointment_id === a.id && p.kind === "payment" && p.method === "online");
    if (paid) a.pay_by = null;
    else Object.assign(a, { status: "cancelled", cancel_reason: "unpaid", pay_by: null });
  }
}

function sessionView(db: Db, s: MockPaymentSession): PaymentSession {
  const appointment = findAppointment(db, s.appointment_id);
  return {
    payment_id: s.id,
    appointment_id: s.appointment_id,
    amount: s.amount,
    currency: "IQD",
    status: s.status,
    // The real gateway's page is on its own site. The demo one is a page of ours.
    form_url: `/pay/demo?payment=${s.id}`,
    created_at: s.created_at,
    pay_by: appointment.pay_by ?? null,
  };
}

// Starts an online payment. The same key again (a second press, a retry) gives back the same payment.
function openPayment(db: Db, user: MockUser, appointmentId: number, amount: number, key: string, returnUrl: string) {
  const existing = db.paymentSessions.find((s) => s.key === key);
  if (existing) return existing;
  if (!(amount > 0)) fail(422, "bad_amount");
  const session: MockPaymentSession = {
    id: crypto.randomUUID(),
    appointment_id: appointmentId,
    user_id: user.id,
    amount,
    status: "created",
    created_at: now().toISOString(),
    key,
    return_url: returnUrl,
  };
  db.paymentSessions.push(session);
  return session;
}

// The gateway's notification has "arrived": the result becomes final, and a success is recorded as a payment.
function settle(db: Db, s: MockPaymentSession) {
  if (s.status !== "created" || !s.outcome || (s.settles_at ?? 0) > Date.now()) return false;
  s.status = s.outcome;
  if (s.status === "success") {
    const appointment = findAppointment(db, s.appointment_id);
    const user = db.users.find((u) => u.id === s.user_id)!;
    // Paid after the deadline passed and the slot was freed: the money goes back.
    if (appointment.status === "cancelled") {
      s.status = "canceled";
      return true;
    }
    const amount = Math.min(s.amount, moneyOf(db, s.appointment_id).balance.IQD);
    if (amount > 0) takePayment(db, user, s.appointment_id, amount, "IQD", "online", `gateway:${s.id}`);
    appointment.pay_by = null;
  }
  return true;
}

// The payment history of some appointments: money that moved, and online payments that didn't go through.
function paymentLog(db: Db, appointmentIds: number[]): PaymentLogEntry[] {
  const about = (appointmentId: number) => {
    const a = findAppointment(db, appointmentId);
    return {
      appointment_id: a.id,
      patient_name: patientName(db, a.patient_id),
      doctor_name: doctorNameOf(db, a.doctor_id),
      appointment_date: a.date,
      appointment_time: a.time,
    };
  };
  const moved: PaymentLogEntry[] = db.payments
    .filter((p) => appointmentIds.includes(p.appointment_id))
    .map((p) => ({
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
      ...about(p.appointment_id),
    }));
  // A successful online payment is already in the list above, as a payment.
  const attempts: PaymentLogEntry[] = db.paymentSessions
    .filter((s) => appointmentIds.includes(s.appointment_id) && s.status !== "success")
    .map((s) => ({
      id: `attempt-${s.id}`,
      kind: "attempt",
      status: s.status,
      at: s.created_at,
      amount: s.amount,
      currency: "IQD",
      method: "online",
      receipt_no: null,
      by: db.users.find((u) => u.id === s.user_id)?.name ?? "",
      reason: "",
      ...about(s.appointment_id),
    }));
  return [...moved, ...attempts].sort((a, b) => b.at.localeCompare(a.at));
}

// Only for the demo payment page (/pay/demo). The real gateway is Qi Card's own site, so this isn't in the Api.
export const demoGateway = {
  // What the payment page shows: the amount and who is being paid.
  info: async (paymentId: string) => {
    const db = read();
    const s = db.paymentSessions.find((x) => x.id === paymentId);
    if (!s) fail(404);
    return delay({ amount: s.amount, currency: "IQD" as const, status: s.status, finished: !!s.outcome });
  },
  // The patient finished on the payment page. Returns where to send them back to.
  finish: async (paymentId: string, outcome: Exclude<PaymentStatus, "created">) => {
    const db = read();
    const s = db.paymentSessions.find((x) => x.id === paymentId);
    if (!s) fail(404);
    if (!s.outcome) Object.assign(s, { outcome, settles_at: Date.now() + 1500 });
    write(db);
    const back = new URL(s.return_url, window.location.origin);
    back.searchParams.set("payment", s.id);
    return delay(back.pathname + back.search);
  },
};

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
  // A stopped account is signed out on its next request.
  if (!user || user.disabled) fail(401);
  if (roles.length > 0 && !roles.includes(user.role)) fail(403);
  return user;
}

// One part of a long list, the way the real server answers: at most 200 at a time, plus the total.
function pageOf<T>(list: T[], { limit, offset = 0 }: PageQuery) {
  const size = Math.max(1, Math.min(limit, 200));
  return { items: list.slice(offset, offset + size), total: list.length };
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
  if (userId) notifyUser(db, userId, key, type, params);
}

// Sends a message straight to one account: a patient's, or a member of staff's.
function notifyUser(db: Db, userId: number, key: string, type: NotificationType, params: Record<string, string | number>) {
  if (db.notifications.some((n) => n.key === key)) return;
  db.notifications.unshift({ id: db.nextId++, user_id: userId, key, type, params, at: now().toISOString(), read: false });
}

// True when any reading is outside its normal range. Files and old one-number results can't be judged.
function isAbnormal(result: LabResult | null) {
  if (result?.type !== "values") return false;
  return result.rows.some((r) => (r.ref_low !== null && r.value < r.ref_low) || (r.ref_high !== null && r.value > r.ref_high));
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

// A doctor may only open the file of a patient who has an appointment or a visit with them.
function requireDoctorSeesPatient(db: Db, user: MockUser, patientId: number) {
  const sees =
    db.appointments.some((a) => a.patient_id === patientId && a.doctor_id === user.doctor_id) ||
    db.visits.some((v) => v.patient_id === patientId && v.doctor_id === user.doctor_id);
  if (!sees) fail(403);
}

const NO_ALERTS: MedicalAlerts = { allergies: [], conditions: [], blood_type: null };

function alertsOf(db: Db, patientId: number): MedicalAlerts {
  return db.patients.find((p) => p.id === patientId)?.alerts ?? NO_ALERTS;
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
    has_vitals: Boolean(a.vitals),
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
  if (item.kind === "visit") addWelfareDiscount(db, appointmentId);
}

// ---------- social welfare ----------

// The approved card that covers this person on this day, if there is one.
function activeWelfare(db: Db, patientId: number, date: string) {
  return db.welfare.find((w) => w.patient_id === patientId && w.status === "approved" && !!w.valid_until && w.valid_until >= date) ?? null;
}

const welfarePercent = (db: Db, patientId: number, date: string) =>
  activeWelfare(db, patientId, date) ? db.settings.welfare_discount_percent : 0;

// The discount is a line of its own on the bill, so the receipt shows it. Rounded to 250 dinars, the smallest note.
// Only once per appointment, and only on the visit fee (not lab tests or medicines).
function addWelfareDiscount(db: Db, appointmentId: number) {
  const a = findAppointment(db, appointmentId);
  const percent = welfarePercent(db, a.patient_id, a.date);
  if (percent <= 0 || db.items.some((i) => i.appointment_id === appointmentId && i.kind === "discount")) return;
  const visit = db.items.filter((i) => i.appointment_id === appointmentId && i.kind === "visit" && i.currency === "IQD").reduce((s, i) => s + i.price, 0);
  const amount = Math.round((visit * percent) / 100 / 250) * 250;
  if (amount <= 0) return;
  db.items.push({
    id: db.nextId++,
    appointment_id: appointmentId,
    label: `Social welfare discount (${percent}%)`,
    label_ar: `خصم الرعاية الاجتماعية (${percent}%)`,
    kind: "discount",
    price: -amount,
    currency: "IQD",
  });
}

function welfareView(db: Db, w: MockWelfare): WelfareRequest {
  const patient = db.patients.find((p) => p.id === w.patient_id);
  return { ...w, patient_name: patient?.name ?? "", patient_phone: patient?.phone ?? "" };
}

const latestWelfare = (db: Db, patientId: number) =>
  db.welfare.filter((w) => w.patient_id === patientId).sort((a, b) => b.submitted_at.localeCompare(a.submitted_at))[0] ?? null;

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
  return {
    no_shows: noShows,
    deposit_required: noShows >= db.settings.no_show_limit,
    deposit_amount: db.settings.deposit_amount,
    welfare_percent: welfarePercent(db, patientId, today()),
  };
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

const stockView = (item: MockStock): StockItem => ({ ...item, price: item.price ?? 0, level: stockLevel(item), expiry: stockExpiry(item) });

function findStock(db: Db, id: number) {
  const item = db.stock.find((s) => s.id === id);
  if (!item) fail(404);
  return item;
}

function logStock(db: Db, user: MockUser, item: MockStock, kind: StockMoveKind, change: number, note = "") {
  db.stockLog.unshift({
    id: db.nextId++,
    at: now().toISOString(),
    by: user.name,
    kind,
    stock_id: item.id,
    item_name: item.name,
    unit: item.unit,
    change,
    quantity_after: item.quantity,
    note,
  });
}

// One barcode belongs to one item, or a scan wouldn't know which item it means.
function requireFreeBarcode(db: Db, barcode: string | null, ignoreId?: number) {
  if (barcode && db.stock.some((s) => s.barcode === barcode && s.id !== ignoreId)) fail(409, "barcode_taken");
}

// Average stars per doctor (best first), and the 5 newest comments.
function ratingsOf(db: Db, rated: MockVisit[]) {
  const by_doctor = db.doctors
    .map((d) => {
      const mine = rated.filter((v) => v.doctor_id === d.id);
      const average = mine.length ? mine.reduce((sum, v) => sum + v.rating!.stars, 0) / mine.length : 0;
      return { label: d.name_ar, average: Math.round(average * 10) / 10, count: mine.length };
    })
    .filter((row) => row.count > 0)
    .sort((a, b) => b.average - a.average);
  const recent = rated
    .filter((v) => v.rating!.comment)
    .sort((a, b) => b.rating!.at.localeCompare(a.rating!.at))
    .slice(0, 5)
    .map((v) => ({ stars: v.rating!.stars, comment: v.rating!.comment, doctor: doctorNameOf(db, v.doctor_id), at: v.rating!.at }));
  return { by_doctor, recent };
}

// The receptionist's shift: from their last closing, or from the start of today if they haven't closed today.
// Only cash payments they took themselves count; a payment reversed later by the accountant is taken out again.
function shiftOf(db: Db, user: MockUser) {
  const lastClose = db.closings.find((c) => c.by === user.name)?.closed_at;
  const startOfDay = new Date(`${today()}T00:00:00`).toISOString();
  const opened_at = lastClose && lastClose > startOfDay ? lastClose : startOfDay;
  const mine = db.payments.filter((p) => p.method === "cash" && p.kind === "payment" && p.by === user.name && p.at > opened_at);
  const expected = zero();
  for (const p of mine) {
    const reversed = db.payments.some((r) => r.ref_id === p.id && r.kind === "reversal");
    if (!reversed) expected[p.currency] += p.amount;
  }
  return { opened_at, payments: mine.length, expected };
}

// The price is copied now, so a later price change doesn't rewrite old sales.
function saleLine(item: MockStock, quantity: number): SaleLine {
  const unit_price = item.price ?? 0;
  return { stock_id: item.id, name: item.name, unit: item.unit, quantity, unit_price, total: unit_price * quantity };
}

function recordSale(db: Db, user: MockUser, kind: PharmacySale["kind"], customer: string, lines: SaleLine[]) {
  const sale: PharmacySale = { id: db.nextId++, at: now().toISOString(), by: user.name, kind, customer, lines, total: lines.reduce((sum, l) => sum + l.total, 0) };
  db.sales.unshift(sale);
  log(db, user, "pharmacy.sale", `${customer || "—"} · ${sale.total.toLocaleString("en-US")} IQD`);
  return sale;
}

// Which counter sale a request key made, so a double press sells only once. Kept in memory: enough for a demo.
const saleKeys = new Map<string, number>();

function session(user: MockUser): LoginResponse {
  const { password: _password, ...publicUser } = user;
  void _password;
  return { access_token: `mock-token-${user.id}`, refresh_token: `mock-refresh-${user.id}`, user: publicUser };
}

export const mockApi: Api = {
  login: async ({ phone, password }) => {
    const user = read().users.find((u) => u.phone === phone && u.password === password);
    if (!user) fail(401, "invalid_credentials");
    if (user.disabled) fail(403, "account_disabled");
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

  forgotPassword: async (phone) => {
    const db = read();
    const user = db.users.find((u) => u.phone === phone);
    const result = { expires_in_minutes: RESET_MINUTES };
    // Same answer when there is no account, so this can't be used to find out who is registered.
    if (!user) return delay(result);
    const code = String(Math.floor(Math.random() * 1_000_000)).padStart(6, "0");
    db.resetCodes = db.resetCodes.filter((c) => c.phone !== phone);
    db.resetCodes.push({ phone, code, expires: Date.now() + RESET_MINUTES * 60_000, tries: 0 });
    write(db);
    return delay({ ...result, dev_code: code });
  },

  resetPassword: async ({ phone, code, new_password }) => {
    const db = read();
    const waiting = db.resetCodes.find((c) => c.phone === phone);
    if (!waiting || waiting.expires < Date.now()) fail(422, "code_expired");
    if (waiting.code !== code) {
      waiting.tries++;
      // Too many wrong tries: the code is thrown away, and a new one must be asked for.
      if (waiting.tries >= RESET_TRIES) db.resetCodes = db.resetCodes.filter((c) => c !== waiting);
      write(db);
      fail(422, waiting.tries >= RESET_TRIES ? "too_many_tries" : "code_wrong");
    }
    const user = db.users.find((u) => u.phone === phone);
    if (!user) fail(422, "code_expired");
    user.password = new_password;
    db.resetCodes = db.resetCodes.filter((c) => c.phone !== phone);
    log(db, user, "password.reset", user.name);
    write(db);
    return delay(undefined);
  },

  changePassword: async ({ current_password, new_password }) => {
    const db = read();
    const user = requireUser(db);
    if (user.password !== current_password) fail(422, "wrong_password");
    if (current_password === new_password) fail(422, "same_password");
    user.password = new_password;
    log(db, user, "password.change", user.name);
    write(db);
    return delay(undefined);
  },

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
    return delay(
      db.patients
        .filter((p) => p.account_id === user.id)
        // The account owner first, then the others in the order they were added.
        .sort((a, b) => Number(a.relation !== "self") - Number(b.relation !== "self") || a.id - b.id)
        .map((p) => ({
          id: p.id,
          name: p.name,
          relation: p.relation ?? "self",
          birth_date: p.birth_date ?? null,
          phone: p.phone || null,
          alerts: alertsOf(db, p.id),
        })),
    );
  },

  patientAlerts: async (patientId) => {
    const db = read();
    const user = requireUser(db, "doctor", "reception", "manager");
    if (user.role === "doctor") requireDoctorSeesPatient(db, user, patientId);
    if (!db.patients.some((p) => p.id === patientId)) fail(404);
    return delay(alertsOf(db, patientId));
  },

  updatePatientAlerts: async (patientId, { allergies, conditions, blood_type }) => {
    const db = read();
    const user = requireUser(db, "doctor");
    requireDoctorSeesPatient(db, user, patientId);
    const patient = db.patients.find((p) => p.id === patientId);
    if (!patient) fail(404);
    // Trimmed, empty ones dropped, and each name only once (ignoring capital letters).
    const clean = (list: string[]) =>
      list.map((x) => x.trim()).filter((x, i, all) => x && all.findIndex((y) => y.toLowerCase() === x.toLowerCase()) === i);
    patient.alerts = { allergies: clean(allergies), conditions: clean(conditions), blood_type };
    log(db, user, "alerts.update", patient.name);
    write(db);
    return delay(patient.alerts);
  },

  addFamilyMember: async ({ name, relation, birth_date, phone }) => {
    const db = read();
    const user = requireUser(db, "patient");
    db.patients.push({ id: db.nextId++, name: name.trim(), relation, birth_date, phone: phone ?? "", account_id: user.id });
    log(db, user, "family.add", name.trim());
    write(db);
    return delay(undefined);
  },

  updateFamilyMember: async (id, { name, relation, birth_date, phone }) => {
    const db = read();
    const user = requireUser(db, "patient");
    const member = db.patients.find((p) => p.id === id && p.account_id === user.id);
    if (!member) fail(404);
    // The account owner's own details are changed from the profile page, not here.
    if (member.relation === "self" || !member.relation) fail(403);
    Object.assign(member, { name: name.trim(), relation, birth_date, phone: phone ?? "" });
    write(db);
    return delay(undefined);
  },

  removeFamilyMember: async (id) => {
    const db = read();
    const user = requireUser(db, "patient");
    const member = db.patients.find((p) => p.id === id && p.account_id === user.id);
    if (!member) fail(404);
    if (member.relation === "self" || !member.relation) fail(403);
    // Someone with a coming appointment stays, so the booking isn't left without an account.
    const upcoming = db.appointments.some((a) => a.patient_id === id && a.date >= today() && (a.status === "booked" || a.status === "arrived"));
    if (upcoming) fail(409, "member_has_bookings");
    // Only the link to the account goes. The medical file stays with the clinic.
    member.account_id = null;
    log(db, user, "family.remove", member.name);
    write(db);
    return delay(undefined);
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
          (["booked", "arrived", "in_progress"].includes(a.status) || a.cancel_reason === "doctor_absent" || a.cancel_reason === "unpaid"),
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
          pay_by: a.pay_by ?? null,
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
          created_at: v.created_at,
          patient_name: patientName(db, v.patient_id),
          doctor: doctorOf(db, v.doctor_id),
          diagnosis: v.diagnosis,
          medicines: v.medicines,
          rating: v.rating ?? null,
        })),
    );
  },

  myFollowUps: async () => {
    const db = read();
    const user = requireUser(db, "patient");
    const ids = ownedPatientIds(db, user);
    return delay(
      db.visits
        .filter((v) => v.follow_up_on && ids.includes(v.patient_id))
        // Done once any new appointment with the same doctor exists for this person, made after the visit.
        .filter(
          (v) =>
            !db.appointments.some(
              (a) => a.patient_id === v.patient_id && a.doctor_id === v.doctor_id && a.status !== "cancelled" && a.date > dateOf(new Date(v.created_at)),
            ),
        )
        // Long overdue ones (more than 30 days late) are dropped, so the list doesn't nag forever.
        .filter((v) => v.follow_up_on! >= addDays(today(), -30))
        .map((v) => ({ visit_id: v.id, patient_id: v.patient_id, patient_name: patientName(db, v.patient_id), doctor: doctorOf(db, v.doctor_id), due: v.follow_up_on! }))
        .sort((a, b) => a.due.localeCompare(b.due)),
    );
  },

  rateVisit: async (visitId, { stars, comment }) => {
    const db = read();
    const user = requireUser(db, "patient");
    const visit = db.visits.find((v) => v.id === visitId);
    // Only visits of people on your own account. Others look like they don't exist.
    if (!visit || !ownedPatientIds(db, user).includes(visit.patient_id)) fail(404);
    if (visit.rating) fail(409, "already_rated");
    if (!Number.isInteger(stars) || stars < 1 || stars > 5) fail(422, "bad_rating");
    visit.rating = { stars, comment: comment.trim().slice(0, 300), at: now().toISOString() };
    write(db);
    return delay(visit.rating);
  },

  book: async ({ patient_id, doctor_id, date, time, kind, pay, idempotency_key, return_url }) => {
    const db = read();
    const user = requireUser(db, "patient");
    if (!ownedPatientIds(db, user).includes(patient_id)) fail(403);
    // Pressed twice, or sent again after the connection dropped: the booking already exists.
    const repeated = db.appointments.find((a) => a.idempotency_key === idempotency_key);
    if (repeated) {
      const session = db.paymentSessions.find((s) => s.key === `${idempotency_key}:pay`);
      return delay({ appointment_id: repeated.id, payment: session ? sessionView(db, session) : null });
    }
    const doctor = findDoctor(db, doctor_id);
    requireFreeSlot(db, doctor, date, time, kind);
    const depositRequired = rulesFor(db, patient_id).deposit_required;
    if (depositRequired && pay === "clinic") fail(409, "deposit_required");
    const branch = workDayOf(doctor, date)!.branch;
    const id = db.nextId++;
    // A patient who must pay a deposit gets a little time to pay. If they don't, the slot is freed for others.
    const payBy = depositRequired ? new Date(now().getTime() + PAY_BY_MINUTES * 60_000).toISOString() : null;
    db.appointments.push({ id, patient_id, doctor_id, date, time, kind, branch, status: "booked", emergency: false, arrival_order: 0, cancel_reason: null, idempotency_key, pay_by: payBy });
    addItem(db, id, visitFee(doctor));
    // Paying online: nothing is paid yet. The patient finishes on the gateway's page.
    let payment: PaymentSession | null = null;
    if (pay !== "clinic") {
      const owed = moneyOf(db, id).balance.IQD;
      const amount = pay === "full" ? owed : Math.min(db.settings.deposit_amount, owed);
      payment = sessionView(db, openPayment(db, user, id, amount, `${idempotency_key}:pay`, return_url));
    }
    log(db, user, "appointment.book", patientName(db, patient_id));
    write(db);
    return delay({ appointment_id: id, payment });
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

  staffBook: async ({ patient_id, new_patient, doctor_id, date, time, kind, idempotency_key }) => {
    const db = read();
    const user = requireUser(db, "reception");
    // Pressed twice, or sent again after the connection dropped: the booking already exists.
    const repeated = db.appointments.find((a) => a.idempotency_key === idempotency_key);
    if (repeated) return delay({ patient_id: repeated.patient_id });
    let patient = patient_id === null ? undefined : db.patients.find((p) => p.id === patient_id);
    if (patient_id !== null && !patient) fail(404);
    if (!patient) {
      if (!new_patient) fail(422);
      // Someone who came before with this phone already has a file, so it is used instead of making a second one.
      patient = db.patients.find((p) => p.phone === new_patient.phone);
      if (!patient) {
        patient = { id: db.nextId++, name: new_patient.name.trim(), phone: new_patient.phone, account_id: null };
        db.patients.push(patient);
      }
    }
    const doctor = findDoctor(db, doctor_id);
    requireFreeSlot(db, doctor, date, time, kind);
    const id = db.nextId++;
    db.appointments.push({
      id,
      patient_id: patient.id,
      doctor_id,
      date,
      time,
      kind,
      branch: workDayOf(doctor, date)!.branch,
      status: "booked",
      emergency: false,
      arrival_order: 0,
      cancel_reason: null,
      idempotency_key,
    });
    // Booked by phone, so the visit is paid at the clinic.
    addItem(db, id, visitFee(doctor));
    // Patients with the app see the booking there too.
    notify(db, patient.id, `booked:${id}`, "booked", { doctor: doctor.name_ar, date, time });
    log(db, user, "appointment.book", patient.name);
    write(db);
    return delay({ patient_id: patient.id });
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

  checkIn: async (id, emergency, idempotency_key) => {
    const db = read();
    const user = requireUser(db, "reception");
    const current = findAppointment(db, id);
    // Already checked in (the same request sent again, or another reception computer did it first):
    // nothing to do. Doing it again would send the patient to the back of the line.
    if (current.checkin_key === idempotency_key || current.status !== "booked") return delay(undefined);
    const appointment = changeAppointment(db, id, { status: "arrived", emergency, arrival_order: db.nextArrival++, checkin_key: idempotency_key });
    issueTicket(db, appointment);
    log(db, user, "appointment.checkin", patientName(db, appointment.patient_id));
    write(db);
    return delay(undefined);
  },

  addWalkIn: async ({ name, phone, doctor_id, emergency, idempotency_key }) => {
    const db = read();
    const user = requireUser(db, "reception");
    // The same walk-in sent again: it's already in the line, so don't add a second one.
    if (db.appointments.some((a) => a.idempotency_key === idempotency_key)) return delay({ duplicate: false });
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
      idempotency_key,
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

  saveVitals: async (appointmentId, vitals) => {
    const db = read();
    const user = requireUser(db, "reception", "doctor");
    const appointment = findAppointment(db, appointmentId);
    // Only for someone at the clinic today: in the queue, or with the doctor.
    if (appointment.date !== today() || !["arrived", "in_progress"].includes(appointment.status)) fail(409, "not_here");
    if (user.role === "doctor" && appointment.doctor_id !== user.doctor_id) fail(403);
    if (Object.values(vitals).every((v) => v === null)) fail(422, "no_vitals");
    appointment.vitals = { ...vitals, at: now().toISOString(), by: user.name };
    log(db, user, "vitals.save", patientName(db, appointment.patient_id));
    write(db);
    return delay({ appointment_id: appointmentId, ...appointment.vitals });
  },

  patientVitals: async (patientId) => {
    const db = read();
    const user = requireUser(db, "doctor", "reception", "manager");
    if (user.role === "doctor") requireDoctorSeesPatient(db, user, patientId);
    return delay(
      db.appointments
        .filter((a) => a.patient_id === patientId && a.vitals)
        .map((a): VitalsRecord => ({ appointment_id: a.id, ...a.vitals! }))
        .sort((a, b) => b.at.localeCompare(a.at)),
    );
  },

  patientHistory: async (patientId) => {
    const db = read();
    const user = requireUser(db, "doctor");
    requireDoctorSeesPatient(db, user, patientId);
    log(db, user, "file.open", patientName(db, patientId));
    write(db);
    return delay(
      db.visits
        .filter((v) => v.patient_id === patientId)
        .map((v): DoctorVisit => ({
          id: v.id,
          created_at: v.created_at,
          patient_name: patientName(db, v.patient_id),
          doctor: doctorOf(db, v.doctor_id),
          diagnosis: v.diagnosis,
          internal_note: v.internal_note,
          follow_up_on: v.follow_up_on ?? null,
          medicines: v.medicines,
          tests: db.labOrders
            .filter((o) => o.visit_id === v.id)
            .map((o) => ({ id: o.id, test: findService(db, o.service_id), status: o.status, result: o.status === "confirmed" ? o.result : null })),
        })),
    );
  },

  finishVisit: async (id, { diagnosis, internal_note, medicines, test_ids, procedure_ids, follow_up_days }) => {
    const db = read();
    const user = requireUser(db, "doctor");
    const appointment = changeAppointment(db, id, { status: "done" });
    log(db, user, "visit.finish", patientName(db, appointment.patient_id));
    notify(db, appointment.patient_id, `rate:${appointment.id}`, "rate_visit", { doctor: doctorNameOf(db, appointment.doctor_id) });
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
      follow_up_on: follow_up_days ? addDays(today(), follow_up_days) : undefined,
    });
    if (follow_up_days) {
      notify(db, appointment.patient_id, `followup:${visitId}`, "follow_up", {
        doctor: doctorNameOf(db, appointment.doctor_id),
        date: addDays(today(), follow_up_days),
      });
    }
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
            allergies: alertsOf(db, v.patient_id).allergies,
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
    const saleLines: SaleLine[] = [];
    for (const [stockId, quantity] of needed) {
      const item = findStock(db, stockId);
      item.quantity -= quantity;
      logStock(db, user, item, "dispense", -quantity, patientName(db, visit.patient_id));
      saleLines.push(saleLine(item, quantity));
    }
    const sale = saleLines.length ? recordSale(db, user, "prescription", patientName(db, visit.patient_id), saleLines) : null;
    // The pharmacist's instructions are saved on each medicine, so the patient sees them in their file.
    visit.medicines = visit.medicines.map((m, i) => ({ ...m, instructions: { ...lines[i].instructions, note: lines[i].instructions.note.trim() } }));
    visit.dispensed = true;
    log(db, user, "prescription.dispense", patientName(db, visit.patient_id));
    write(db);
    return delay(sale);
  },

  sellOverCounter: async ({ customer, lines, idempotency_key }) => {
    const db = read();
    const user = requireUser(db, "pharmacy");
    // Pressed twice: the same key gives back the sale that was already made.
    const repeated = db.sales.find((s) => s.id === saleKeys.get(idempotency_key));
    if (repeated) return delay(repeated);
    if (lines.length === 0) fail(422, "empty_sale");
    const needed = new Map<number, number>();
    for (const line of lines) {
      if (!Number.isInteger(line.quantity) || line.quantity <= 0) fail(422, "bad_amount");
      needed.set(line.stock_id, (needed.get(line.stock_id) ?? 0) + line.quantity);
    }
    // Check everything first, so a problem with one line sells nothing.
    for (const [stockId, quantity] of needed) {
      const item = findStock(db, stockId);
      if (stockExpiry(item) === "expired") fail(409, "stock_expired");
      if (item.quantity < quantity) fail(409, "out_of_stock");
    }
    const saleLines: SaleLine[] = [];
    for (const [stockId, quantity] of needed) {
      const item = findStock(db, stockId);
      item.quantity -= quantity;
      logStock(db, user, item, "sale", -quantity, customer.trim());
      saleLines.push(saleLine(item, quantity));
    }
    const sale = recordSale(db, user, "counter", customer.trim(), saleLines);
    saleKeys.set(idempotency_key, sale.id);
    write(db);
    return delay(sale);
  },

  listSales: async (date) => {
    const db = read();
    requireUser(db, "pharmacy", "accountant", "manager");
    return delay(db.sales.filter((s) => dateOf(new Date(s.at)) === date));
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

  medicineCatalog: async () => {
    const db = read();
    requireUser(db, "doctor", "pharmacy");
    return delay(
      db.stock
        .map((item) => {
          const view = stockView(item);
          const availability = view.expiry === "expired" ? "expired" : view.level === "out" ? "out" : view.level === "low" ? "low" : "available";
          return { name: item.name, availability } as const;
        })
        .sort((a, b) => a.name.localeCompare(b.name)),
    );
  },

  createStock: async (input) => {
    const db = read();
    const user = requireUser(db, "pharmacy");
    if (db.stock.some((s) => s.name.toLowerCase() === input.name.trim().toLowerCase())) fail(409, "stock_exists");
    requireFreeBarcode(db, input.barcode);
    const item = { id: db.nextId++, ...input, name: input.name.trim() };
    db.stock.push(item);
    logStock(db, user, item, "create", item.quantity);
    log(db, user, "stock.create", input.name);
    write(db);
    return delay(undefined);
  },

  updateStock: async (id, input) => {
    const db = read();
    const user = requireUser(db, "pharmacy");
    requireFreeBarcode(db, input.barcode, id);
    const item = findStock(db, id);
    const before = item.quantity;
    Object.assign(item, input);
    // A quantity typed in by hand (for example after counting the shelf) shows as a change too.
    logStock(db, user, item, "edit", item.quantity - before);
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
    logStock(db, user, item, "receive", quantity);
    log(db, user, "stock.receive", `${item.name} · ${quantity}`);
    write(db);
    return delay(undefined);
  },

  stockLog: async (limit) => {
    const db = read();
    requireUser(db, "pharmacy", "manager");
    return delay(db.stockLog.slice(0, limit));
  },

  listStaff: async () => {
    const db = read();
    const viewer = requireUser(db, "reception", "manager");
    return delay(
      db.users
        .filter((u) => viewer.role === "manager" || u.role !== "patient")
        .map(({ id, name, phone, role, disabled }): StaffUser => ({ id, name, phone, role, active: !disabled })),
    );
  },

  createStaff: async ({ name, phone, password, role, doctor }: CreateStaffRequest) => {
    const db = read();
    const creator = requireUser(db, "reception", "manager");
    // Only the manager can make another manager, or an account for a patient.
    if ((role === "manager" || role === "patient") && creator.role !== "manager") fail(403);
    if (db.users.some((u) => u.phone === phone)) fail(409, "phone_taken");
    const user: MockUser = { id: db.nextId++, name, phone, role, password };
    if (role === "patient") {
      // A walk-in with this phone already has a medical file. The account takes it over,
      // so their earlier visits, results and prescriptions show in the app straight away.
      const file = db.patients.find((p) => p.phone === phone && p.account_id === null);
      if (file) Object.assign(file, { account_id: user.id, relation: "self" as const });
      else db.patients.push({ id: db.nextId++, name, phone, account_id: user.id, relation: "self" });
    }
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

  updateStaff: async (id, { name, phone, new_password }) => {
    const db = read();
    const manager = requireUser(db, "manager");
    const user = db.users.find((u) => u.id === id);
    if (!user) fail(404);
    if (db.users.some((u) => u.phone === phone && u.id !== id)) fail(409, "phone_taken");
    // The same name and phone show in the medical file and on the doctor's card, so they change there too.
    if (user.role === "patient") {
      const file = db.patients.find((p) => p.account_id === user.id && p.relation === "self");
      if (file) Object.assign(file, { name, phone });
    }
    if (user.doctor_id) {
      const doctor = db.doctors.find((d) => d.id === user.doctor_id);
      if (doctor) doctor.name_ar = name;
    }
    Object.assign(user, { name, phone });
    if (new_password) user.password = new_password;
    log(db, manager, "staff.update", name);
    write(db);
    return delay(undefined);
  },

  setStaffActive: async (id, active) => {
    const db = read();
    const manager = requireUser(db, "manager");
    const user = db.users.find((u) => u.id === id);
    if (!user) fail(404);
    if (!active) {
      // The manager can't lock themselves out, and the complex must always keep one working manager.
      if (user.id === manager.id) fail(422, "cannot_disable_self");
      if (user.role === "manager" && db.users.filter((u) => u.role === "manager" && !u.disabled).length <= 1) fail(422, "last_manager");
    }
    user.disabled = !active;
    log(db, manager, active ? "staff.enable" : "staff.disable", user.name);
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

  listAudit: async ({ action, ...q }) => {
    const db = read();
    requireUser(db, "manager");
    return delay(pageOf(db.audit.filter((e) => !action || e.action === action), q));
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
      input.type === "values"
        ? { ...input, note: input.note.trim() }
        : { type: "file", file_name: input.file.name, file_type: input.file.type, data_url: await fileToDataUrl(input.file), note: input.note.trim() };
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
    // The doctor who asked for the test is told too, with a warning when a reading is out of range.
    const doctorUser = db.users.find((u) => u.role === "doctor" && u.doctor_id === order.doctor_id);
    if (doctorUser) {
      notifyUser(db, doctorUser.id, `doctor-result:${order.id}`, "result_for_doctor", {
        test: findService(db, order.service_id).name_ar,
        patient: patientName(db, order.patient_id),
        abnormal: isAbnormal(order.result) ? 1 : 0,
      });
    }
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

  startPayment: async (appointmentId, { idempotency_key, return_url }) => {
    const db = read();
    const user = requireUser(db, "patient");
    const appointment = requireOwnAppointment(db, user, appointmentId);
    if (appointment.status !== "booked") fail(409, "cancelled");
    const session = openPayment(db, user, appointmentId, moneyOf(db, appointmentId).balance.IQD, idempotency_key, return_url);
    write(db);
    return delay(sessionView(db, session));
  },

  myWelfare: async () => {
    const db = read();
    const user = requireUser(db, "patient");
    return delay(
      ownedPatientIds(db, user)
        .map((id) => latestWelfare(db, id))
        .filter((w): w is MockWelfare => w !== null)
        .map((w) => welfareView(db, w)),
    );
  },

  submitWelfare: async (patientId, { card_number, photo }) => {
    const db = read();
    const user = requireUser(db, "patient");
    if (!ownedPatientIds(db, user).includes(patientId)) fail(403);
    if (!photo.type.startsWith("image/")) fail(422, "not_an_image");
    if (photo.size > 3 * 1024 * 1024) fail(413, "file_too_big");
    // One open request at a time: a new photo replaces one that's still waiting.
    db.welfare = db.welfare.filter((w) => !(w.patient_id === patientId && w.status === "pending"));
    const request: MockWelfare = {
      id: db.nextId++,
      patient_id: patientId,
      card_number: card_number.trim(),
      photo_url: await fileToDataUrl(photo),
      status: "pending",
      submitted_at: now().toISOString(),
      reviewed_by: null,
      reviewed_at: null,
      valid_until: null,
      reject_reason: "",
    };
    db.welfare.push(request);
    // Every receptionist is told there's a card to check.
    for (const r of db.users.filter((u) => u.role === "reception" && !u.disabled)) {
      notifyUser(db, r.id, `welfare-submitted-${request.id}-${r.id}`, "welfare_submitted", { patient: patientName(db, patientId) });
    }
    log(db, user, "welfare.submit", patientName(db, patientId));
    write(db);
    return delay(welfareView(db, request));
  },

  listWelfare: async (status) => {
    const db = read();
    requireUser(db, "reception", "manager");
    return delay(
      db.welfare
        .filter((w) => w.status === status)
        .sort((a, b) => (status === "pending" ? a.submitted_at.localeCompare(b.submitted_at) : (b.reviewed_at ?? "").localeCompare(a.reviewed_at ?? "")))
        .map((w) => welfareView(db, w)),
    );
  },

  reviewWelfare: async (id, review) => {
    const db = read();
    const user = requireUser(db, "reception", "manager");
    const w = db.welfare.find((x) => x.id === id);
    if (!w) fail(404);
    if (w.status !== "pending") fail(409, "already_reviewed");
    const name = patientName(db, w.patient_id);
    if (review.approve) {
      if (review.valid_until <= today()) fail(422, "bad_valid_until");
      Object.assign(w, { status: "approved", valid_until: review.valid_until, reviewed_by: user.name, reviewed_at: now().toISOString() });
      // Appointments already booked and not paid yet get the discount too.
      for (const a of db.appointments.filter((x) => x.patient_id === w.patient_id && x.status === "booked" && x.date >= today())) {
        if (moneyOf(db, a.id).paid.IQD === 0) addWelfareDiscount(db, a.id);
      }
      notify(db, w.patient_id, `welfare-approved-${w.id}`, "welfare_approved", {
        patient: name,
        percent: db.settings.welfare_discount_percent,
        date: review.valid_until,
      });
      log(db, user, "welfare.approve", name);
    } else {
      if (review.reason.trim().length < 3) fail(422, "reason_needed");
      Object.assign(w, { status: "rejected", reject_reason: review.reason.trim(), reviewed_by: user.name, reviewed_at: now().toISOString() });
      notify(db, w.patient_id, `welfare-rejected-${w.id}`, "welfare_rejected", { patient: name, reason: w.reject_reason });
      log(db, user, "welfare.reject", `${name} · ${w.reject_reason}`);
    }
    write(db);
    return delay(welfareView(db, w));
  },

  myPayments: async ({ patient_id, ...q }) => {
    const db = read();
    const user = requireUser(db, "patient");
    const mine = ownedPatientIds(db, user).filter((id) => !patient_id || id === patient_id);
    const appointmentIds = db.appointments.filter((a) => mine.includes(a.patient_id)).map((a) => a.id);
    return delay(pageOf(paymentLog(db, appointmentIds), q));
  },

  paymentStatus: async (paymentId) => {
    const db = read();
    const user = requireUser(db, "patient");
    const session = db.paymentSessions.find((s) => s.id === paymentId);
    // Only the person who started the payment can see it.
    if (!session || session.user_id !== user.id) fail(404);
    if (settle(db, session)) write(db);
    return delay(sessionView(db, session));
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

  shiftSummary: async () => {
    const db = read();
    const user = requireUser(db, "reception");
    return delay(shiftOf(db, user));
  },

  closeShift: async ({ counted, note }) => {
    const db = read();
    const user = requireUser(db, "reception");
    if (!(counted.IQD >= 0) || !(counted.USD >= 0)) fail(422, "bad_amount");
    const shift = shiftOf(db, user);
    const closing: CashClosing = {
      id: db.nextId++,
      by: user.name,
      opened_at: shift.opened_at,
      closed_at: now().toISOString(),
      payments: shift.payments,
      expected: shift.expected,
      counted,
      difference: { IQD: counted.IQD - shift.expected.IQD, USD: counted.USD - shift.expected.USD },
      note: note.trim(),
    };
    db.closings.unshift(closing);
    log(db, user, "cash.close", `${closing.difference.IQD.toLocaleString("en-US")} IQD`);
    write(db);
    return delay(closing);
  },

  listClosings: async () => {
    const db = read();
    const user = requireUser(db, "reception", "accountant", "manager");
    return delay(user.role === "reception" ? db.closings.filter((c) => c.by === user.name) : db.closings);
  },

  listExpenses: async (month) => {
    const db = read();
    requireUser(db, "accountant", "manager");
    return delay(db.expenses.filter((e) => inMonth(e.date, month)).sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id));
  },

  addExpense: async ({ date, category, amount, currency, note }) => {
    const db = read();
    const user = requireUser(db, "accountant");
    if (!(amount > 0)) fail(422, "bad_amount");
    if (date > today()) fail(422, "future_date");
    const expense: Expense = { id: db.nextId++, date, category, amount, currency, note: note.trim(), by: user.name, at: now().toISOString(), voided: null };
    db.expenses.unshift(expense);
    log(db, user, "expense.add", `${note.trim() || category} · ${amount.toLocaleString("en-US")} ${currency}`);
    write(db);
    return delay(expense);
  },

  voidExpense: async (id, reason) => {
    const db = read();
    const user = requireUser(db, "accountant");
    const expense = db.expenses.find((e) => e.id === id);
    if (!expense) fail(404);
    if (expense.voided) fail(409, "already_voided");
    if (reason.trim().length < 3) fail(422, "reason_needed");
    expense.voided = { by: user.name, at: now().toISOString(), reason: reason.trim() };
    log(db, user, "expense.void", `${expense.note || expense.category} · ${reason.trim()}`);
    write(db);
    return delay(expense);
  },

  listLedger: async (q) => {
    const db = read();
    requireUser(db, "accountant", "manager");
    const undone = (id: number) => db.payments.some((p) => p.ref_id === id);
    // Only the part asked for is built, so a long history stays fast.
    const part = pageOf(db.payments.slice().reverse(), q);
    return delay({
      total: part.total,
      items: part.items.map(({ ref_id: _r, key: _k, ...p }) => {
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
    });
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
            // The welfare discount comes off the visit income, so it's shared like the visit fee.
            if (item.kind === "visit" || item.kind === "discount") visitIncome += item.price * share;
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
    const collected = collectedOf(db, monthPayments);
    const pharmacyMonth = db.sales.filter((s) => s.at.slice(0, 7) === month).reduce((sum, s) => sum + s.total, 0);
    // Voided expenses were mistakes, so they don't count.
    const expenses = sumAmounts(db.expenses.filter((e) => !e.voided && inMonth(e.date, month)));
    return delay({
      month,
      by_day: countBy(visited.map((a) => a.date)).sort((a, b) => a.label.localeCompare(b.label)),
      by_doctor: countBy(visited.map((a) => doctorNameOf(db, a.doctor_id))),
      by_branch: countBy(visited.map((a) => a.branch)),
      top_no_shows: countBy(noShows.map((a) => patientName(db, a.patient_id))).slice(0, 5),
      billed: billedOf(db, new Set(visited.map((a) => a.id))),
      collected,
      today_billed: billedOf(db, new Set(todays.map((a) => a.id))),
      today_collected: collectedOf(db, todayPayments),
      pharmacy_month: pharmacyMonth,
      pharmacy_today: db.sales.filter((s) => dateOf(new Date(s.at)) === today()).reduce((sum, s) => sum + s.total, 0),
      expenses,
      profit: { IQD: collected.IQD + pharmacyMonth - expenses.IQD, USD: collected.USD - expenses.USD },
    });
  },

  // Patients and staff each see their own messages.
  myNotifications: async () => {
    const db = read();
    const user = requireUser(db);
    if (user.role === "patient") makeTimedNotifications(db, user);
    write(db);
    return delay(
      db.notifications
        .filter((n) => n.user_id === user.id)
        .map(({ id, type, params, at, read }) => ({ id, type, params, at, read })),
    );
  },

  readNotifications: async () => {
    const db = read();
    const user = requireUser(db);
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
      ratings: ratingsOf(db, db.visits.filter((v) => v.rating && inRange(dateOf(new Date(v.created_at))))),
    };
    return delay(result);
  },

  searchPatients: async (query, paging) => {
    const db = read();
    requireUser(db, "reception", "manager");
    const q = query.trim().toLowerCase();
    return delay(
      pageOf(
        db.patients
          .filter((p) => !q || p.name.toLowerCase().includes(q) || p.phone.includes(q))
          .map((p) => patientSummary(db, p))
          // Patients seen most recently come first. Never-seen patients go last.
          .sort((a, b) => (b.last_visit ?? "").localeCompare(a.last_visit ?? "") || a.name.localeCompare(b.name)),
        paging,
      ),
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
      alerts: alertsOf(db, patient.id),
      family: db.patients
        .filter((p) => patient.account_id !== null && p.account_id === patient.account_id && p.id !== patient.id)
        .map((p) => ({
          id: p.id,
          name: p.name,
          relation: p.relation ?? "self",
          birth_date: p.birth_date ?? null,
          phone: p.phone || null,
          alerts: alertsOf(db, p.id),
        })),
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
      payment_log: paymentLog(db, appointments.map((a) => a.id)),
      welfare: (() => {
        const w = latestWelfare(db, patientId);
        return w ? welfareView(db, w) : null;
      })(),
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
