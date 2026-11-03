import { getToken } from "../auth";
import { ApiError } from "./errors";
import type { Api } from "./http";
import type {
  CreateStaffRequest,
  Doctor,
  DoctorVisit,
  LoginResponse,
  Medicine,
  MyAppointment,
  Relation,
  Role,
  StaffAppointment,
  StaffUser,
  User,
} from "./types";

// All people in this file are fake. Real patient data must never be used here.
export const MOCK_PASSWORD = "password123";

export const MOCK_LOGINS = {
  patient: "07800000005",
  reception: "07800000001",
  doctor: "07800000002",
  pharmacy: "07800000004",
};

const STORAGE_KEY = "alrahma.mock.v3";

type MockDoctor = Doctor & { slots: string[] };

const DEFAULT_SLOTS = ["09:00", "09:20", "09:40", "10:00", "10:20", "10:40"];

const BRANCHES = {
  main: { branch: "Main Branch", branch_ar: "الفرع الرئيسي" },
  second: { branch: "Second Branch", branch_ar: "الفرع الثاني" },
};

const seedDoctors: MockDoctor[] = [
  {
    id: 1,
    name: "Dr. Ali Hassan",
    name_ar: "د. علي حسن",
    specialty: "Internal Medicine",
    specialty_ar: "باطنية",
    branch: "Main Branch",
    branch_ar: "الفرع الرئيسي",
    fee: 25000,
    slots: ["09:00", "09:20", "09:40", "10:00", "10:20", "10:40"],
  },
  {
    id: 2,
    name: "Dr. Noor Jasim",
    name_ar: "د. نور جاسم",
    specialty: "Pediatrics",
    specialty_ar: "أطفال",
    branch: "Second Branch",
    branch_ar: "الفرع الثاني",
    fee: 20000,
    slots: ["16:00", "16:15", "16:30", "16:45", "17:00", "17:15"],
  },
];

type MockUser = User & { password: string };
// relation says who this person is to the account owner. Walk-ins have no account.
type MockPatient = { id: number; name: string; phone: string; account_id: number | null; relation?: Relation };
type MockAppointment = Omit<StaffAppointment, "patient_name"> & { arrival_order: number };
type MockVisit = {
  id: number;
  patient_id: number;
  doctor_id: number;
  diagnosis: string;
  internal_note: string;
  medicines: Medicine[];
  dispensed: boolean;
};

type Db = {
  nextId: number;
  nextArrival: number;
  doctors: MockDoctor[];
  users: MockUser[];
  patients: MockPatient[];
  appointments: MockAppointment[];
  visits: MockVisit[];
};

const seed = (): Db => ({
  nextId: 100,
  nextArrival: 2,
  doctors: seedDoctors,
  users: [
    { id: 1, name: "سارة موظفة", phone: MOCK_LOGINS.reception, role: "reception", password: MOCK_PASSWORD },
    { id: 2, name: "د. علي حسن", phone: MOCK_LOGINS.doctor, role: "doctor", doctor_id: 1, password: MOCK_PASSWORD },
    { id: 3, name: "د. نور جاسم", phone: "07800000003", role: "doctor", doctor_id: 2, password: MOCK_PASSWORD },
    { id: 4, name: "أحمد الصيدلي", phone: MOCK_LOGINS.pharmacy, role: "pharmacy", password: MOCK_PASSWORD },
    { id: 5, name: "زينب كريم", phone: MOCK_LOGINS.patient, role: "patient", password: MOCK_PASSWORD },
  ],
  patients: [
    { id: 1, name: "زينب كريم", phone: MOCK_LOGINS.patient, account_id: 5, relation: "self" },
    { id: 2, name: "مصطفى كريم", phone: "07700000002", account_id: 5, relation: "child" },
    { id: 3, name: "حسن عباس", phone: "07700000003", account_id: null },
    { id: 4, name: "مريم ناصر", phone: "07700000004", account_id: null },
  ],
  appointments: [
    { id: 1, patient_id: 4, doctor_id: 1, day: "today", time: "09:00", status: "arrived", emergency: false, arrival_order: 1 },
    { id: 2, patient_id: 3, doctor_id: 1, day: "today", time: "09:20", status: "booked", emergency: false, arrival_order: 0 },
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
});

function read(): Db {
  const saved = localStorage.getItem(STORAGE_KEY);
  return saved ? (JSON.parse(saved) as Db) : seed();
}

function write(db: Db) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
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

function doctorOf(db: Db, id: number) {
  const doctor = db.doctors.find((d) => d.id === id);
  if (!doctor) fail(404);
  return publicDoctor(doctor);
}

function publicDoctor({ slots: _slots, ...doctor }: MockDoctor): Doctor {
  return (void _slots, doctor);
}

function patientName(db: Db, id: number) {
  return db.patients.find((p) => p.id === id)?.name ?? "";
}

function staffView(db: Db, { arrival_order: _order, ...a }: MockAppointment): StaffAppointment {
  return (void _order, { ...a, patient_name: patientName(db, a.patient_id) });
}

function changeAppointment(db: Db, id: number, change: Partial<MockAppointment>) {
  const appointment = db.appointments.find((a) => a.id === id);
  if (!appointment) fail(404);
  Object.assign(appointment, change);
  write(db);
  return appointment;
}

function isTaken(db: Db, doctorId: number, day: string, time: string) {
  return db.appointments.some(
    (a) => a.doctor_id === doctorId && a.day === day && a.time === time && a.status !== "cancelled",
  );
}

const queueRank = (a: MockAppointment) => {
  if (a.status === "in_progress") return 0;
  if (a.emergency) return 1;
  return a.time ? 2 : 3;
};

// Order: in the room, emergencies, appointments by time, then walk-ins.
function queueOf(db: Db, doctorId: number) {
  return db.appointments
    .filter((a) => a.doctor_id === doctorId && (a.status === "arrived" || a.status === "in_progress"))
    .sort((a, b) => {
      const rank = queueRank(a) - queueRank(b);
      if (rank !== 0) return rank;
      return queueRank(a) === 2 ? a.time.localeCompare(b.time) : a.arrival_order - b.arrival_order;
    });
}

function session(user: MockUser): LoginResponse {
  const { password: _password, ...publicUser } = user;
  void _password;
  return {
    access_token: `mock-token-${user.id}`,
    refresh_token: `mock-refresh-${user.id}`,
    user: publicUser,
  };
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

  doctorSlots: async (doctorId, day) => {
    const db = read();
    requireUser(db, "patient");
    const doctor = db.doctors.find((d) => d.id === doctorId);
    if (!doctor) fail(404);
    return delay(doctor.slots.map((time) => ({ time, available: !isTaken(db, doctorId, day, time) })));
  },

  myFamily: async () => {
    const db = read();
    const user = requireUser(db, "patient");
    return delay(db.patients.filter((p) => p.account_id === user.id).map(({ id, name, relation }) => ({ id, name, relation: relation ?? "self" })));
  },

  myAppointments: async () => {
    const db = read();
    const user = requireUser(db, "patient");
    const ids = db.patients.filter((p) => p.account_id === user.id).map((p) => p.id);
    const list = db.appointments
      .filter((a) => ids.includes(a.patient_id) && a.status !== "cancelled" && a.status !== "done")
      .map((a): MyAppointment => {
        const position = queueOf(db, a.doctor_id).findIndex((q) => q.id === a.id);
        return {
          id: a.id,
          patient_name: patientName(db, a.patient_id),
          doctor: doctorOf(db, a.doctor_id),
          day: a.day,
          time: a.time,
          status: a.status,
          ahead: position === -1 ? null : position,
        };
      });
    return delay(list);
  },

  myVisits: async () => {
    const db = read();
    const user = requireUser(db, "patient");
    const ids = db.patients.filter((p) => p.account_id === user.id).map((p) => p.id);
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

  book: async ({ patient_id, doctor_id, day, time }) => {
    const db = read();
    const user = requireUser(db, "patient");
    if (db.patients.find((p) => p.id === patient_id)?.account_id !== user.id) fail(403);
    if (isTaken(db, doctor_id, day, time)) fail(409, "slot_taken");
    db.appointments.push({ id: db.nextId++, patient_id, doctor_id, day, time, status: "booked", emergency: false, arrival_order: 0 });
    write(db);
    return delay(undefined);
  },

  cancelAppointment: async (id) => {
    const db = read();
    requireUser(db, "patient");
    changeAppointment(db, id, { status: "cancelled" });
    return delay(undefined);
  },

  bookedToday: async () => {
    const db = read();
    requireUser(db, "reception");
    return delay(
      db.appointments
        .filter((a) => a.day === "today" && a.status === "booked")
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
    requireUser(db, "reception");
    changeAppointment(db, id, { status: "arrived", emergency, arrival_order: db.nextArrival++ });
    return delay(undefined);
  },

  addWalkIn: async ({ name, phone, doctor_id, emergency }) => {
    const db = read();
    requireUser(db, "reception");
    const existing = db.patients.find((p) => p.phone === phone);
    const patient = existing ?? { id: db.nextId++, name, phone, account_id: null };
    if (!existing) db.patients.push(patient);
    db.appointments.push({
      id: db.nextId++,
      patient_id: patient.id,
      doctor_id,
      day: "today",
      time: "",
      status: "arrived",
      emergency,
      arrival_order: db.nextArrival++,
    });
    write(db);
    return delay({ duplicate: Boolean(existing) });
  },

  startVisit: async (id) => {
    const db = read();
    requireUser(db, "doctor");
    changeAppointment(db, id, { status: "in_progress" });
    return delay(undefined);
  },

  patientHistory: async (patientId) => {
    const db = read();
    const user = requireUser(db, "doctor");
    const seesPatient =
      db.appointments.some((a) => a.patient_id === patientId && a.doctor_id === user.doctor_id) ||
      db.visits.some((v) => v.patient_id === patientId && v.doctor_id === user.doctor_id);
    if (!seesPatient) fail(403);
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
        })),
    );
  },

  finishVisit: async (id, { diagnosis, internal_note, medicines }) => {
    const db = read();
    requireUser(db, "doctor");
    const appointment = changeAppointment(db, id, { status: "done" });
    db.visits.unshift({
      id: db.nextId++,
      patient_id: appointment.patient_id,
      doctor_id: appointment.doctor_id,
      diagnosis,
      internal_note,
      medicines,
      dispensed: medicines.length === 0,
    });
    write(db);
    return delay(undefined);
  },

  listPrescriptions: async () => {
    const db = read();
    requireUser(db, "pharmacy");
    return delay(
      db.visits
        .filter((v) => v.medicines.length > 0)
        .map((v) => ({
          id: v.id,
          patient_name: patientName(db, v.patient_id),
          medicines: v.medicines,
          dispensed: v.dispensed,
        })),
    );
  },

  dispense: async (id) => {
    const db = read();
    requireUser(db, "pharmacy");
    const visit = db.visits.find((v) => v.id === id);
    if (!visit) fail(404);
    if (visit.dispensed) fail(409, "already_dispensed");
    visit.dispensed = true;
    write(db);
    return delay(undefined);
  },
  listStaff: async () => {
    const db = read();
    requireUser(db, "reception");
    return delay(
      db.users
        .filter((u): u is MockUser & { role: StaffUser["role"] } => u.role !== "patient")
        .map(({ id, name, phone, role }) => ({ id, name, phone, role })),
    );
  },

  createStaff: async ({ name, phone, password, role, doctor }: CreateStaffRequest) => {
    const db = read();
    requireUser(db, "reception");
    if (db.users.some((u) => u.phone === phone)) fail(409, "phone_taken");
    const user: MockUser = { id: db.nextId++, name, phone, role, password };
    if (role === "doctor") {
      if (!doctor) fail(422);
      const id = db.nextId++;
      db.doctors.push({
        id,
        name: doctor.name_en,
        name_ar: name,
        specialty: doctor.specialty_en,
        specialty_ar: doctor.specialty_ar,
        ...BRANCHES[doctor.branch],
        fee: doctor.fee,
        slots: DEFAULT_SLOTS,
      });
      user.doctor_id = id;
    }
    db.users.push(user);
    write(db);
    return delay(undefined);
  },
};
