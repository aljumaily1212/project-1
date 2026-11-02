# Hamla Project One

**Developer:** Yasser, Frontend Developer
**Started:** 2 November 2026
**Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS, Axios, developed in VS Code. Structure and design follow the Bareeed project

This is the running log of the project. Every time code is written, it gets an entry here with a line-by-line explanation and a screenshot of the result. When the project is finished, or whenever Yasser asks, this log becomes a PDF with the explanation, the code and the website pictures side by side.

## How each entry is written

1. **Goal:** what we are building and why
2. **File:** where the code lives
3. **Code:** the full code
4. **Line by line:** what every line does and why it is needed
5. **Result:** a screenshot from the website, saved in `screenshots/`

## Machine setup

| Tool | Version |
| --- | --- |
| Node.js | 24.20.0 |
| npm | 11.19.0 |
| Git | 2.51.2 |
| VS Code | 1.143.1 |

## Entries

### Entry 1: Connecting the project to GitHub

**Goal:** link the folder on this computer to the private GitHub repo `aljumaily1212/project-1`, and make sure unwanted files are never uploaded.

**Folders:** this log is in `project-1/docs/hamla-project-one/` because `create-next-app` allows a `docs` folder in an existing project, so Next.js can still be installed here later.

**File:** `project-1/.gitignore`

**Code:**

```gitignore
node_modules/
.next/
out/
*.log
.env*
!.env.example
Thumbs.db
```

**Line by line:**

- `.gitignore` is a list of files that Git must not track. Anything matching a line here stays on your computer and is not uploaded to GitHub.
- `node_modules/` is the folder of installed packages. It is huge, and anyone can rebuild it with `npm install`, so it does not belong in the repo. The `/` at the end means "this is a folder".
- `.next/` is the folder Next.js generates when it runs or builds the site. It is recreated automatically.
- `out/` is the folder used if the site is exported as static files. It is also generated.
- `*.log` ignores log files. The `*` means "any name", so `error.log` and `debug.log` both match.
- `.env*` ignores every file whose name starts with `.env`, such as `.env` and `.env.local`. These hold secrets like API keys, so this is the most important line in the file.
- `!.env.example` makes one exception, because `!` means "do not ignore this". An example file lists the variable names with no real values, so teammates know what they need to set.
- `Thumbs.db` is a thumbnail cache file made by Windows. It has nothing to do with the project.

**Git commands used:**

```bash
git init -b main
git remote add origin https://github.com/aljumaily1212/project-1.git
```

- `git init` turns the folder into a Git repository by creating a hidden `.git` folder, where Git keeps its history.
- `-b main` names the first branch `main`, the same default name GitHub uses.
- `git remote add` saves a link to the GitHub repo. `origin` is the usual nickname for that link, so later you can write `origin` in place of the long address.

**Result:** the folder is linked to GitHub. Nothing has been committed or uploaded yet, so this entry has no website screenshot.

**Update:** when Next.js was installed in Entry 2, it replaced this short `.gitignore` with its own longer one. Entry 3 explains the final version.

### Entry 2: Creating the Next.js project

**Goal:** create a working Next.js project inside `project-1`.

**Command:**

```bash
npx create-next-app@latest . --ts --tailwind --eslint --app --no-src-dir --import-alias "@/*" --use-npm --no-react-compiler --no-turbopack --disable-git --yes
```

**Line by line:**

- `npx` downloads a tool and runs it once, without installing it permanently.
- `create-next-app@latest` is the official project creator. We got Next.js 16.4.3 and React 19.
- `.` means "create it in the current folder".
- `--ts` uses TypeScript, and `--tailwind` installs Tailwind CSS.
- `--eslint` installs a tool that checks code for problems.
- `--app` uses the App Router, where folders inside `app/` become website addresses.
- `--no-src-dir` keeps `app/` in the main folder, the same as Bareeed.
- `--import-alias "@/*"` lets you write `@/lib/auth` from any file.
- `--use-npm` uses npm. `--disable-git` skips Git, because Entry 1 did that. `--yes` accepts the defaults.
- `--no-react-compiler` leaves out an optional feature. `--no-turbopack` was accepted, but Next.js 16 still used Turbopack, its build tool. This does not affect our code.

**Packages added afterward, the same ones as Bareeed:**

```bash
npm install axios class-variance-authority cn lucide-react motion radix-ui react-hook-form @hookform/resolvers zod sonner tw-animate-css
```

- `axios` sends requests to the API.
- `class-variance-authority` and `cn` build button styles and join class names.
- `lucide-react` provides the icons, and `motion` provides the animations.
- `radix-ui` provides the accessible dropdown, and `tw-animate-css` animates it.
- `react-hook-form`, `@hookform/resolvers` and `zod` handle forms and check their values.
- `sonner` shows the small popup messages, called toasts.

**How to run the site:**

```bash
npm run dev
```

Then open `http://localhost:3000`.

### Entry 3: Mentor task 1, `.env`, `.env.example` and `.gitignore`

**Goal:** keep settings outside the code, and never upload `.env`.

**File:** `.env.example`

```bash
# Copy this file to .env and change the values.
# .env is ignored by git. Never put secrets here:
# everything starting with NEXT_PUBLIC_ is visible in the browser.

# Base URL of the backend API
NEXT_PUBLIC_API_URL=http://localhost:8000

# true  = use fake data from lib/api/mock.ts (when the API is down or a feature isn't ready)
# false = call the real API
# Restart `npm run dev` after changing this.
NEXT_PUBLIC_USE_MOCK=true
```

**File:** `.env` has the same two values, without the comments. It is not printed here on purpose, because this file stays out of Git.

**Line by line:**

- `#` starts a comment, which the computer ignores.
- `NEXT_PUBLIC_API_URL` is the address of the backend. It is here so DevOps can change it for each server without touching the code.
- `NEXT_PUBLIC_USE_MOCK` is the mock switch. `true` uses fake data, and `false` uses the real API.
- The `NEXT_PUBLIC_` start is important. Next.js copies these values into the browser code, so anyone can read them. Never put a password or a secret key in one.
- The first version, `.env`, is the private one on your computer. `.env.example` is the public guide that shows teammates which values they need.

**The `.gitignore` lines that do the work:**

```gitignore
.env*
!.env.example
```

- `.env*` ignores every file whose name starts with `.env`.
- `!` means "except". So `.env.example` is uploaded and `.env` is not.

**Checked with Git:** `git check-ignore -v .env` confirmed `.env` is ignored, and `git status` lists `.env.example` as a file that can be committed.

**File:** `lib/config.ts`

```ts
export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000").replace(/\/$/, "");

export const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true";
```

**Line by line:**

- `process.env.NEXT_PUBLIC_API_URL` reads the value from `.env`.
- `?? "http://localhost:8000"` uses a default if the value is missing.
- `.replace(/\/$/, "")` removes a `/` at the end, so we never build an address with `//`.
- `USE_MOCK = ... === "true"` turns the text into true or false. Values in `.env` are always text, so we compare with `"true"`. Any other value means false, which is the safe choice.

### Entry 4: Mentor task 2, the Axios interceptor

**Goal:** add the login token to every request automatically, except public ones.

**What is an interceptor?** It is a function that runs on every request before it leaves. You write the token logic once, and no page needs to think about it.

**File:** `lib/api/axios.ts`

```ts
import axios, { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from "axios";
import { API_URL } from "../config";
import { clearSession, getRefreshToken, getToken, updateTokens } from "../auth";
import { DEFAULT_LOCALE, LOCALE_KEY } from "../boot";
import { ApiError, NETWORK_ERROR } from "./errors";
import type { ApiEnvelope, LoginResponse } from "./types";

const PUBLIC_PATHS = ["/auth/login", "/auth/register", "/auth/refresh", "/public/"];

export const http = axios.create({
  baseURL: API_URL,
  timeout: 20_000,
});

function currentLocale() {
  try {
    return localStorage.getItem(LOCALE_KEY) ?? DEFAULT_LOCALE;
  } catch {
    return DEFAULT_LOCALE;
  }
}

http.interceptors.request.use((config) => {
  const isPublic = PUBLIC_PATHS.some((p) => config.url?.startsWith(p));
  const token = getToken();
  if (!isPublic && token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  config.headers["Accept-Language"] = currentLocale();
  return config;
});

let refreshing: Promise<string | null> | null = null;

function refreshToken(): Promise<string | null> {
  const token = getRefreshToken();
  if (!token) return Promise.resolve(null);
  refreshing ??= axios
    .post<ApiEnvelope<LoginResponse>>(`${API_URL}/auth/refresh`, { refresh_token: token }, { timeout: 20_000 })
    .then(({ data }) => {
      if (!data.success || !data.data.refresh_token) return null;
      updateTokens(data.data.access_token, data.data.refresh_token);
      return data.data.access_token;
    })
    .catch(() => null)
    .finally(() => (refreshing = null));
  return refreshing;
}

http.interceptors.response.use(
  (res: AxiosResponse<ApiEnvelope<unknown>>) => {
    const body = res.data;
    if (body && body.success === false) {
      throw new ApiError(res.status, body.message, body.errors, undefined, body.code);
    }
    return { ...res, data: body?.success ? body.data : body };
  },
  async (err: AxiosError<ApiEnvelope<unknown>>) => {
    if (!err.response) {
      throw new ApiError(NETWORK_ERROR, "");
    }
    const { status, data } = err.response;
    const config = err.config as (InternalAxiosRequestConfig & { retried?: boolean }) | undefined;
    const isAuthCall = PUBLIC_PATHS.some((p) => config?.url?.startsWith(p));
    if (status === 401 && config && !config.retried && !isAuthCall) {
      const token = await refreshToken();
      if (token) {
        config.retried = true;
        config.headers.Authorization = `Bearer ${token}`;
        return http(config);
      }
    }
    if (status === 401 && !isAuthCall) {
      clearSession();
    }
    const message = data && data.success === false ? data.message : "";
    const errors = data && data.success === false ? data.errors : undefined;
    const code = data && data.success === false ? data.code : undefined;
    const retryAfter = Number(err.response.headers["retry-after"]) || undefined;
    throw new ApiError(status, message, errors, retryAfter, code);
  },
);
```

**Line by line, the request interceptor:**

- `PUBLIC_PATHS` is the list of addresses that need no login: login, register, refresh and anything under `/public/`.
- `axios.create({ baseURL: API_URL, timeout: 20_000 })` makes our own Axios copy. Every request starts with our API address, and gives up after 20 seconds. `20_000` is simply 20000 written so it is easy to read.
- `currentLocale()` reads the chosen language. The `try/catch` stops a crash if the browser blocks storage.
- `http.interceptors.request.use((config) => { ... })` registers the function. `config` describes the request about to be sent.
- `PUBLIC_PATHS.some((p) => config.url?.startsWith(p))` is true if the address starts with a public path.
- `const token = getToken()` reads the token saved at login.
- `if (!isPublic && token)` means "not public, and we have a token".
- `` config.headers.Authorization = `Bearer ${token}` `` adds the header. This is the line your mentor asked for.
- `config.headers["Accept-Language"] = currentLocale()` tells the API which language to answer in.
- `return config` lets the request continue.

**Line by line, the response interceptor:**

- `refreshing` remembers a refresh in progress. If five requests fail together, they share one refresh.
- `refreshToken()` asks for a new token. It uses plain `axios`, not `http`, so it does not pass through our interceptors.
- `refreshing ??= ...` means "set this only if it is empty".
- The first function in `http.interceptors.response.use` runs on success. `body.success === false` throws an error, and otherwise it returns only the useful `data`.
- The second function runs on failure.
- `if (!err.response)` means the server never answered, so it is a network error.
- `status === 401` means the token is not valid. We refresh it and repeat the request once. `config.retried = true` prevents an endless loop.
- `return http(config)` sends the original request again.
- `clearSession()` logs the person out if the refresh failed.
- `throw new ApiError(...)` gives the pages one clear error type.

**Proved with a test:** a small fake backend recorded the real headers:

| Request | `Authorization` header |
| --- | --- |
| `/public/doctors` | None |
| `/auth/login` | None |
| `/me/family` | `Bearer access-1` |
| Expired token | Refreshed, then repeated with `Bearer access-2` |

### Entry 5: Mentor task 3, the mock switch

**Goal:** change between fake data and the real API by editing one word.

**How to use it:** open `.env`, change the value, then restart `npm run dev`. The restart is needed because `.env` is read when the site starts.

```bash
NEXT_PUBLIC_USE_MOCK=true
```

```bash
NEXT_PUBLIC_USE_MOCK=false
```

**File:** `lib/api/index.ts`

```ts
import { USE_MOCK } from "../config";
import { httpApi } from "./http";
import { mockApi } from "./mock";

export const api = USE_MOCK ? mockApi : httpApi;

export { ApiError } from "./errors";
export type * from "./types";
```

**Line by line:**

- `import { httpApi } from "./http"` is the real version, and `import { mockApi } from "./mock"` is the fake version.
- `export const api = USE_MOCK ? mockApi : httpApi` is the whole switch. Pages only use `api`, so they never know which one they got.
- `export type * from "./types"` lets pages import types from the same place.

**File:** `lib/api/types.ts`

```ts
export type ApiEnvelope<T> =
  | { success: true; data: T }
  | { success: false; message: string; errors?: Record<string, unknown>; code?: string };

export type Role = "patient" | "reception" | "doctor" | "pharmacy";
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

export interface Prescription {
  id: number;
  patient_name: string;
  medicines: Medicine[];
  dispensed: boolean;
}
```

**The main idea:** this file is the agreement between the frontend and the API.

- `ApiEnvelope<T>` is the wrapper every API answer comes in. `<T>` is a generic, meaning "any type of data goes here".
- `{ success: true; ... } | { success: false; ... }` means the answer is one shape or the other.
- `MyAppointment` has `ahead`, the number of people before the patient.
- `PatientVisit` has no `internal_note`, and `DoctorVisit extends PatientVisit` adds it. So TypeScript itself keeps the note away from patient screens.

**Important:** the backend has not given us its real API yet, so the addresses and fields here are my best guess, based on Bareeed. When the documentation arrives, `lib/api/types.ts` and `lib/api/http.ts` will change, and the screens should need few changes.

**File:** `lib/api/http.ts`

```ts
import { getRefreshToken } from "../auth";
import { http } from "./axios";
import type {
  BookRequest,
  Day,
  Doctor,
  DoctorVisit,
  FamilyMember,
  FinishVisitRequest,
  LoginRequest,
  LoginResponse,
  MyAppointment,
  PatientVisit,
  Prescription,
  RegisterRequest,
  Slot,
  StaffAppointment,
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

  doctorSlots: (doctorId: number, day: Day) =>
    http.get<Slot[]>(`/doctors/${doctorId}/slots`, { params: { day } }).then((r) => r.data),

  myFamily: () => http.get<FamilyMember[]>("/me/family").then((r) => r.data),

  myAppointments: () => http.get<MyAppointment[]>("/me/appointments").then((r) => r.data),

  myVisits: () => http.get<PatientVisit[]>("/me/visits").then((r) => r.data),

  book: (body: BookRequest) => http.post<null>("/appointments", body).then(() => undefined),

  cancelAppointment: (id: number) => http.post<null>(`/appointments/${id}/cancel`, {}).then(() => undefined),

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
};

export type Api = typeof httpApi;
```

**Line by line:**

- `httpApi` is one object holding one function for each API call.
- `http.post<LoginResponse>("/auth/login", body)` sends data. `<LoginResponse>` tells TypeScript the answer's shape.
- `.then((r) => r.data)` returns only the data.
- `` `/doctors/${doctorId}/slots` `` builds the address with a value inside it.
- `{ params: { day } }` adds `?day=today` to the address.
- `.then(() => undefined)` is used when the answer has nothing useful.
- `export type Api = typeof httpApi` creates a type from this object. The mock must match it, so the two can never drift apart.

**File:** `lib/api/mock.ts`

```ts
import { getToken } from "../auth";
import { ApiError } from "./errors";
import type { Api } from "./http";
import type {
  Doctor,
  DoctorVisit,
  LoginResponse,
  Medicine,
  MyAppointment,
  Role,
  StaffAppointment,
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

const STORAGE_KEY = "alrahma.mock";

const doctors: (Doctor & { slots: string[] })[] = [
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
type MockPatient = { id: number; name: string; phone: string; account_id: number | null };
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
  users: MockUser[];
  patients: MockPatient[];
  appointments: MockAppointment[];
  visits: MockVisit[];
};

const seed = (): Db => ({
  nextId: 100,
  nextArrival: 2,
  users: [
    { id: 1, name: "سارة موظفة", phone: MOCK_LOGINS.reception, role: "reception", password: MOCK_PASSWORD },
    { id: 2, name: "د. علي حسن", phone: MOCK_LOGINS.doctor, role: "doctor", doctor_id: 1, password: MOCK_PASSWORD },
    { id: 3, name: "د. نور جاسم", phone: "07800000003", role: "doctor", doctor_id: 2, password: MOCK_PASSWORD },
    { id: 4, name: "أحمد الصيدلي", phone: MOCK_LOGINS.pharmacy, role: "pharmacy", password: MOCK_PASSWORD },
    { id: 5, name: "زينب كريم", phone: MOCK_LOGINS.patient, role: "patient", password: MOCK_PASSWORD },
  ],
  patients: [
    { id: 1, name: "زينب كريم", phone: MOCK_LOGINS.patient, account_id: 5 },
    { id: 2, name: "مصطفى كريم", phone: "07700000002", account_id: 5 },
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

function doctorOf(id: number) {
  const doctor = doctors.find((d) => d.id === id);
  if (!doctor) fail(404);
  return publicDoctor(doctor);
}

function publicDoctor({ slots: _slots, ...doctor }: (typeof doctors)[number]): Doctor {
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
    db.patients.push({ id: db.nextId++, name, phone, account_id: user.id });
    write(db);
    return delay(session(user));
  },

  logout: () => delay(undefined),

  listDoctors: () => delay(doctors.map(publicDoctor)),

  doctorSlots: async (doctorId, day) => {
    const db = read();
    requireUser(db, "patient");
    const doctor = doctors.find((d) => d.id === doctorId);
    if (!doctor) fail(404);
    return delay(doctor.slots.map((time) => ({ time, available: !isTaken(db, doctorId, day, time) })));
  },

  myFamily: async () => {
    const db = read();
    const user = requireUser(db, "patient");
    return delay(db.patients.filter((p) => p.account_id === user.id).map(({ id, name }) => ({ id, name })));
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
          doctor: doctorOf(a.doctor_id),
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
          doctor: doctorOf(v.doctor_id),
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
          doctor: doctorOf(v.doctor_id),
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
};
```

**Line by line:**

- `MOCK_PASSWORD` and `MOCK_LOGINS` are the fake accounts shown on the login pages.
- `doctors` and `seed()` hold the starting fake data.
- `Omit<StaffAppointment, "patient_name">` means "that type without this field".
- `read()` loads the data from `localStorage`, or uses `seed()` the first time.
- `write(db)` saves it, so the data survives a refresh and is shared between tabs.
- `delay(value)` waits 150 milliseconds, to behave like a real network and show loading states.
- `fail(status, code)` throws the same `ApiError` as the real API. The return type `never` means this function never returns normally.
- `requireUser(db, ...roles)` acts like a backend guard. Wrong token gives 401, and wrong role gives 403.
- `doctorOf` and `publicDoctor` remove the `slots` field before giving out a doctor.
- `void _slots` tells the lint tool we are removing this value on purpose.
- `staffView` adds the patient's name and removes the internal field.
- `isTaken(...)` checks if a time is booked.
- `queueRank` and `queueOf` apply the client's queue order: with the doctor, emergency, booked, then walk-in.
- `export const mockApi: Api = { ... }` must match the real API exactly, because of `: Api`.
- `book` checks that this patient is on the account, then refuses a taken time with error 409 and the code `slot_taken`.
- `addWalkIn` searches by phone, and reuses the patient if the number exists.
- `myVisits` builds each visit field by field, and leaves out `internal_note`.
- `listPrescriptions` returns only the name and medicines, so the pharmacy never receives a diagnosis.
- `dispense` refuses a second time with `already_dispensed`.

**Proved with a test:** `false` loaded data from a fake backend, and the mock badge and reset button disappeared. `true` ran the full flow on fake data.

### Entry 6: Login and sessions (`lib/auth.ts`)

**Goal:** remember who is logged in, and tell every screen when that changes.

**Code:**

```ts
"use client";

import { useSyncExternalStore } from "react";
import type { Role, User } from "./api/types";

const KEY = "alrahma.session";

export interface Session {
  token: string;
  refreshToken?: string;
  user: User;
}

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function readRaw(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

function readSession(): Session | null {
  const raw = readRaw();
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Session;
  } catch {
    return null;
  }
}

export function getToken(): string | null {
  return readSession()?.token ?? null;
}

export function getRefreshToken(): string | null {
  return readSession()?.refreshToken ?? null;
}

export function updateTokens(token: string, refreshToken: string) {
  const session = readSession();
  if (session) saveSession({ ...session, token, refreshToken });
}

export function saveSession(session: Session) {
  localStorage.setItem(KEY, JSON.stringify(session));
  emit();
}

export function clearSession() {
  try {
    localStorage.removeItem(KEY);
  } catch {
  }
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => e.key === KEY && listener();
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function useSession(): { session: Session | null; ready: boolean } {
  const raw = useSyncExternalStore(subscribe, readRaw, () => undefined);
  if (raw === undefined) return { session: null, ready: false };
  if (raw === null) return { session: null, ready: true };
  try {
    return { session: JSON.parse(raw) as Session, ready: true };
  } catch {
    return { session: null, ready: true };
  }
}

export function canUseDashboard(role: Role) {
  return role !== "patient";
}

export function homeFor(role: Role) {
  return role === "patient" ? "/account" : `/${role}`;
}

export function useIsStaff(): boolean {
  const { session } = useSession();
  return !!session && canUseDashboard(session.user.role);
}

export function useIsPatient(): boolean {
  const { session } = useSession();
  return session?.user.role === "patient";
}
```

**Line by line:**

- `"use client"` means this runs in the browser.
- `Session` holds the token, the refresh token and the user.
- `listeners` and `emit` tell every screen that the session changed.
- `readRaw()` reads the saved text. `readSession()` turns it into an object.
- `getToken()` is what the Axios interceptor calls.
- `?.` and `??` give `null` safely when nobody is logged in.
- `updateTokens` saves new tokens after a refresh.
- `saveSession` runs after login, and `clearSession` runs after logout.
- `subscribe` also listens for `storage`, so logging out in one tab logs out other tabs.
- `useSession()` is the hook pages use. `useSyncExternalStore` reads data living outside React. The third value, `undefined`, is for the server, which has no `localStorage`. That is why `ready` exists: pages wait until the browser has checked.
- `canUseDashboard(role)` is true for all staff.
- `homeFor(role)` gives each role its own home page.

**Important:** the token is stored in `localStorage`, the same as Bareeed. Ask the backend and team leader if this is acceptable for patient data, because many teams prefer secure cookies.

### Entry 7: Checking forms (`lib/validation.ts`)

**Code:**

```ts
import { z } from "zod";

const phone = z.string().regex(/^07\d{9}$/, "validation.phone");
const password = z.string().min(6, "validation.password");

export const loginSchema = z.object({ phone, password });
export type LoginForm = z.infer<typeof loginSchema>;

export const registerSchema = loginSchema.extend({
  name: z.string().trim().min(2, "validation.name"),
});
export type RegisterForm = z.infer<typeof registerSchema>;

export const walkInSchema = z.object({
  name: z.string().trim().min(2, "validation.name"),
  phone,
  doctor_id: z.string(),
  emergency: z.boolean(),
});
export type WalkInForm = z.infer<typeof walkInSchema>;
```

**Line by line:**

- `z.string().regex(/^07\d{9}$/, "validation.phone")` requires `07` and then 9 digits. `^` means the start, `\d` means a digit, and `$` means the end. The second value is the translation key of the error message.
- `min(6, ...)` requires at least 6 characters.
- `z.object({ phone, password })` joins the rules into one form.
- `z.infer<typeof loginSchema>` creates the TypeScript type from the rules, so we do not write it twice.
- `.extend({ name: ... })` adds a field to an existing form.
- `.trim()` removes spaces at the start and end.

### Entry 8: Two languages (`lib/i18n/`)

**Goal:** the same system as Bareeed, with one file per language.

**File:** `lib/i18n/en.ts`

```ts
export const en = {
  "app.name": "Al-Rahma",
  "app.subtitle": "Al-Rahma Medical Complex · Staff",
  "app.mockBadge": "Mock data",

  "lang.switch": "عربي",
  "theme.toDark": "Switch to night mode",
  "theme.toLight": "Switch to day mode",

  "nav.logout": "Log out",
  "nav.reception": "Reception",
  "nav.doctor": "Doctor",
  "nav.pharmacy": "Pharmacy",
  "nav.staff": "Staff",

  "landing.nav.how": "How it works",
  "landing.nav.doctors": "Doctors",
  "landing.nav.customer": "Patient login",
  "landing.nav.account": "My account",
  "landing.nav.staff": "Staff login",
  "landing.nav.dashboard": "Dashboard",
  "landing.hero.eyebrow": "Two branches in Karbala",
  "landing.hero.title1": "Your appointment is booked.",
  "landing.hero.title2": "Your turn is on your phone.",
  "landing.hero.subtitle": "Book your visit with the doctor you want, follow your turn in the queue, and keep your whole medical file in one place.",
  "landing.hero.cta": "Book a visit",
  "landing.hero.secondary": "See the doctors",
  "landing.ticket.title": "Your turn",
  "landing.ticket.doctor": "Internal Medicine · Main Branch",
  "landing.ticket.ahead": "2 people ahead of you",
  "landing.ticket.next": "You are next soon",
  "landing.how.title": "Three simple steps",
  "landing.how.step1.title": "Book from your phone",
  "landing.how.step1.body": "Choose a doctor and a free time, for yourself or for your family.",
  "landing.how.step2.title": "Arrive and follow your turn",
  "landing.how.step2.body": "Reception checks you in, and your phone shows how many people are ahead.",
  "landing.how.step3.title": "Keep your file together",
  "landing.how.step3.body": "Your diagnosis and prescriptions stay in one file, with every doctor.",
  "landing.doctors.title": "Our doctors",
  "landing.reset": "Reset mock data",

  "login.phone": "Phone number",
  "login.password": "Password",
  "login.submit": "Log in",
  "login.staffOnly": "This login is for staff. Use the patient login.",
  "login.goPatient": "Go to patient login",
  "login.mockHint": "Mock account:",
  "account.login.title": "Welcome back",
  "account.login.subtitle": "Log in to book and follow your visits",
  "account.login.patientsOnly": "This login is for patients. Use the staff login.",
  "account.login.goStaff": "Go to staff login",
  "account.login.noAccount": "No account yet?",
  "account.login.register": "Create an account",
  "account.register.title": "Create your account",
  "account.register.subtitle": "It takes a few seconds",
  "account.register.name": "Full name",
  "account.register.submit": "Create account",
  "account.register.hasAccount": "Already have an account?",
  "account.register.login": "Log in",

  "account.nav.book": "Book",
  "account.nav.appointments": "My appointments",
  "account.nav.records": "My medical file",

  "book.title": "Book a visit",
  "book.subtitle": "Choose the doctor, the day and a free time",
  "book.for": "Booking for",
  "book.doctor": "Doctor",
  "book.day": "Day",
  "book.time": "Time",
  "book.noSlots": "No free times on this day",
  "book.confirm": "Confirm booking",
  "book.done": "Your appointment is booked",

  "appointments.title": "My appointments",
  "appointments.subtitle": "Your turn updates by itself",
  "appointments.empty": "You have no appointments",
  "appointments.emptyHint": "Book a visit and it will appear here",
  "appointments.bookNow": "Book a visit",
  "appointments.cancel": "Cancel appointment",
  "appointments.cancelled": "Appointment cancelled",
  "appointments.yourTurn": "It's your turn now",
  "appointments.ahead": "{n} ahead of you",
  "appointments.withDoctor": "You are with the doctor",

  "records.title": "My medical file",
  "records.subtitle": "All your visits and prescriptions",
  "records.empty": "No visits recorded",
  "records.emptyHint": "Your visits will appear here",

  "visit.diagnosis": "Diagnosis",
  "visit.prescription": "Prescription",
  "visit.noMedicines": "No medicines",
  "visit.medicineLine": "{name} · Dose {dose} · {days} days",

  "reception.title": "Reception",
  "reception.subtitle": "Check patients in and follow every queue",
  "reception.today": "Today's appointments",
  "reception.empty": "No appointments waiting to arrive",
  "reception.checkIn": "Check in",
  "reception.emergency": "Emergency",
  "reception.checkedIn": "Patient checked in",
  "reception.walkIn": "Walk-in patient",
  "reception.name": "Name",
  "reception.doctor": "Doctor",
  "reception.add": "Add to queue",
  "reception.added": "Patient added to the queue",
  "reception.duplicate": "This number already exists, so the same patient file was used",
  "reception.walkInLabel": "Walk-in",

  "queue.title": "Queue",
  "queue.empty": "The queue is empty",
  "queue.emergency": "Emergency",

  "doctor.title": "Today's patients",
  "doctor.subtitle": "Call the next patient and write the visit",
  "doctor.noCurrent": "No patient in the room",
  "doctor.noCurrentHint": "Call the next patient from the queue",
  "doctor.current": "Current patient",
  "doctor.callNext": "Call next patient",
  "doctor.history": "Previous visits",
  "doctor.noHistory": "No previous visits",
  "doctor.internalNote": "Internal note (doctors only)",
  "doctor.medicine": "Medicine",
  "doctor.dose": "Dose",
  "doctor.days": "Days",
  "doctor.addMedicine": "Add medicine",
  "doctor.finish": "Finish visit and save prescription",
  "doctor.finished": "Visit saved",

  "pharmacy.title": "Pharmacy",
  "pharmacy.subtitle": "Prescriptions only, nothing else from the file",
  "pharmacy.waiting": "Waiting to be dispensed",
  "pharmacy.noWaiting": "No prescriptions waiting",
  "pharmacy.dispensed": "Dispensed",
  "pharmacy.noDispensed": "No dispensed prescriptions",
  "pharmacy.dispense": "Dispense prescription",
  "pharmacy.done": "Prescription dispensed",

  "status.booked": "Booked",
  "status.arrived": "In queue",
  "status.in_progress": "With doctor",
  "status.done": "Finished",
  "status.cancelled": "Cancelled",

  "day.today": "Today",
  "day.tomorrow": "Tomorrow",

  "common.currency": "IQD",
  "common.fee": "Fee",
  "common.retry": "Try again",
  "common.loadFailed": "Could not load this",

  "validation.phone": "Enter a phone number like 07XXXXXXXXX",
  "validation.password": "Use at least 6 characters",
  "validation.name": "Enter the full name",

  "error.network": "Could not reach the server. Check your internet",
  "error.generic": "Something went wrong. Please try again",
  "error.401": "Please log in again",
  "error.403": "You don't have access to this",
  "error.404": "Not found",
  "error.429": "Too many tries. Wait {s} seconds",

  "apiError.slot_taken": "This time was just taken. Please choose another",
  "apiError.invalid_credentials": "Wrong phone number or password",
  "apiError.phone_taken": "This phone number already has an account",
  "apiError.already_dispensed": "This prescription was already dispensed",
};

export type MessageKey = keyof typeof en;
```

**File:** `lib/i18n/ar.ts`

```ts
import type { MessageKey } from "./en";

export const ar: Record<MessageKey, string> = {
  "app.name": "الرحمة",
  "app.subtitle": "مجمع الرحمة الطبي · الموظفين",
  "app.mockBadge": "بيانات تجريبية",

  "lang.switch": "English",
  "theme.toDark": "الوضع الليلي",
  "theme.toLight": "الوضع النهاري",

  "nav.logout": "خروج",
  "nav.reception": "الاستقبال",
  "nav.doctor": "الطبيب",
  "nav.pharmacy": "الصيدلية",
  "nav.staff": "موظف",

  "landing.nav.how": "شلون يشتغل",
  "landing.nav.doctors": "الأطباء",
  "landing.nav.customer": "دخول المرضى",
  "landing.nav.account": "حسابي",
  "landing.nav.staff": "دخول الموظفين",
  "landing.nav.dashboard": "لوحة التحكم",
  "landing.hero.eyebrow": "فرعين بكربلاء",
  "landing.hero.title1": "موعدك محجوز.",
  "landing.hero.title2": "ودورك بجوالك.",
  "landing.hero.subtitle": "احجز عند الطبيب اللي تريده، تابع دورك بالطابور، وخلي ملفك الطبي كله بمكان واحد.",
  "landing.hero.cta": "احجز موعد",
  "landing.hero.secondary": "شوف الأطباء",
  "landing.ticket.title": "دورك",
  "landing.ticket.doctor": "باطنية · الفرع الرئيسي",
  "landing.ticket.ahead": "قدامك مراجعين اثنين",
  "landing.ticket.next": "دورك قريب",
  "landing.how.title": "ثلاث خطوات وبس",
  "landing.how.step1.title": "احجز من جوالك",
  "landing.how.step1.body": "اختار الطبيب ووقت فاضي، لنفسك أو لأهلك.",
  "landing.how.step2.title": "تعال وتابع دورك",
  "landing.how.step2.body": "الاستقبال يسجل وصولك، وجوالك يوريك كم واحد قدامك.",
  "landing.how.step3.title": "ملفك كله سوا",
  "landing.how.step3.body": "تشخيصاتك ووصفاتك بملف واحد عند كل الأطباء.",
  "landing.doctors.title": "أطباؤنا",
  "landing.reset": "إعادة البيانات التجريبية",

  "login.phone": "رقم الهاتف",
  "login.password": "كلمة المرور",
  "login.submit": "دخول",
  "login.staffOnly": "هذا الدخول للموظفين. استخدم دخول المرضى.",
  "login.goPatient": "روح لدخول المرضى",
  "login.mockHint": "حساب تجريبي:",
  "account.login.title": "هلا بيك",
  "account.login.subtitle": "سجل دخولك حتى تحجز وتتابع مواعيدك",
  "account.login.patientsOnly": "هذا الدخول للمرضى. استخدم دخول الموظفين.",
  "account.login.goStaff": "روح لدخول الموظفين",
  "account.login.noAccount": "ما عندك حساب؟",
  "account.login.register": "سوي حساب",
  "account.register.title": "سوي حسابك",
  "account.register.subtitle": "ياخذ ثواني",
  "account.register.name": "الاسم الكامل",
  "account.register.submit": "إنشاء الحساب",
  "account.register.hasAccount": "عندك حساب؟",
  "account.register.login": "سجل دخول",

  "account.nav.book": "حجز",
  "account.nav.appointments": "مواعيدي",
  "account.nav.records": "ملفي الطبي",

  "book.title": "حجز موعد",
  "book.subtitle": "اختار الطبيب واليوم ووقت فاضي",
  "book.for": "الحجز لـ",
  "book.doctor": "الطبيب",
  "book.day": "اليوم",
  "book.time": "الوقت",
  "book.noSlots": "ما كو أوقات فاضية بهذا اليوم",
  "book.confirm": "تأكيد الحجز",
  "book.done": "انحجز موعدك",

  "appointments.title": "مواعيدي",
  "appointments.subtitle": "دورك يتحدث لحاله",
  "appointments.empty": "ما عندك مواعيد",
  "appointments.emptyHint": "احجز موعد ويطلع هنا",
  "appointments.bookNow": "احجز موعد",
  "appointments.cancel": "إلغاء الموعد",
  "appointments.cancelled": "انلغى الموعد",
  "appointments.yourTurn": "دورك هسه",
  "appointments.ahead": "قدامك {n} مراجع",
  "appointments.withDoctor": "أنت داخل الكشف",

  "records.title": "ملفي الطبي",
  "records.subtitle": "كل زياراتك ووصفاتك",
  "records.empty": "ما كو زيارات مسجلة",
  "records.emptyHint": "زياراتك تطلع هنا",

  "visit.diagnosis": "التشخيص",
  "visit.prescription": "الوصفة",
  "visit.noMedicines": "ما كو أدوية",
  "visit.medicineLine": "{name} · الجرعة {dose} · {days} أيام",

  "reception.title": "الاستقبال",
  "reception.subtitle": "سجل الوصول وتابع كل الطوابير",
  "reception.today": "مواعيد اليوم",
  "reception.empty": "ما كو مواعيد بانتظار الوصول",
  "reception.checkIn": "تسجيل وصول",
  "reception.emergency": "حالة طارئة",
  "reception.checkedIn": "انسجل وصول المريض",
  "reception.walkIn": "مراجع بدون موعد",
  "reception.name": "الاسم",
  "reception.doctor": "الطبيب",
  "reception.add": "إضافة للطابور",
  "reception.added": "انضاف المراجع للطابور",
  "reception.duplicate": "هذا الرقم مسجل مسبقاً، فاستخدمنا نفس ملف المريض",
  "reception.walkInLabel": "بدون موعد",

  "queue.title": "الطابور",
  "queue.empty": "الطابور فارغ",
  "queue.emergency": "طارئ",

  "doctor.title": "مرضى اليوم",
  "doctor.subtitle": "استدعي المريض التالي واكتب الزيارة",
  "doctor.noCurrent": "ما كو مريض داخل الكشف",
  "doctor.noCurrentHint": "استدعي المريض التالي من الطابور",
  "doctor.current": "المريض الحالي",
  "doctor.callNext": "استدعاء التالي",
  "doctor.history": "الزيارات السابقة",
  "doctor.noHistory": "ما كو زيارات سابقة",
  "doctor.internalNote": "ملاحظة داخلية (للأطباء فقط)",
  "doctor.medicine": "الدواء",
  "doctor.dose": "الجرعة",
  "doctor.days": "عدد الأيام",
  "doctor.addMedicine": "إضافة دواء",
  "doctor.finish": "إنهاء الكشف وحفظ الوصفة",
  "doctor.finished": "انحفظت الزيارة",

  "pharmacy.title": "الصيدلية",
  "pharmacy.subtitle": "الوصفات بس، بدون باقي الملف",
  "pharmacy.waiting": "بانتظار الصرف",
  "pharmacy.noWaiting": "ما كو وصفات بانتظار الصرف",
  "pharmacy.dispensed": "تم صرفها",
  "pharmacy.noDispensed": "ما كو وصفات مصروفة",
  "pharmacy.dispense": "صرف الوصفة",
  "pharmacy.done": "انصرفت الوصفة",

  "status.booked": "محجوز",
  "status.arrived": "بالطابور",
  "status.in_progress": "داخل الكشف",
  "status.done": "انتهى",
  "status.cancelled": "ملغي",

  "day.today": "اليوم",
  "day.tomorrow": "باجر",

  "common.currency": "د.ع",
  "common.fee": "الكشفية",
  "common.retry": "حاول مرة ثانية",
  "common.loadFailed": "ما گدرنا نحمّل هذا",

  "validation.phone": "اكتب رقم مثل 07XXXXXXXXX",
  "validation.password": "لازم 6 أحرف على الأقل",
  "validation.name": "اكتب الاسم الكامل",

  "error.network": "ما گدرنا نوصل للسيرفر. تأكد من الإنترنت",
  "error.generic": "صار خطأ. حاول مرة ثانية",
  "error.401": "سجل دخولك مرة ثانية",
  "error.403": "ما عندك صلاحية لهذا",
  "error.404": "ما موجود",
  "error.429": "محاولات هواية. انتظر {s} ثانية",

  "apiError.slot_taken": "هذا الوقت انحجز قبل شوي، اختار وقت ثاني",
  "apiError.invalid_credentials": "رقم الهاتف أو كلمة المرور غلط",
  "apiError.phone_taken": "هذا الرقم عنده حساب",
  "apiError.already_dispensed": "هذه الوصفة منصرفة قبل",
};
```

**File:** `lib/i18n/index.tsx`, copied from Bareeed

```tsx
"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import { ApiError, NETWORK_ERROR } from "../api/errors";
import { DEFAULT_LOCALE as BOOT_LOCALE, LOCALE_KEY } from "../boot";
import { ar } from "./ar";
import { en, type MessageKey } from "./en";

export type Locale = "ar" | "en";
export type { MessageKey };

export const DEFAULT_LOCALE: Locale = BOOT_LOCALE;

const dictionaries: Record<Locale, Record<MessageKey, string>> = { ar, en };

const listeners = new Set<() => void>();

function readLocale(): Locale {
  try {
    const v = localStorage.getItem(LOCALE_KEY);
    return v === "en" || v === "ar" ? v : DEFAULT_LOCALE;
  } catch {
    return DEFAULT_LOCALE;
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setLocale(locale: Locale) {
  try {
    localStorage.setItem(LOCALE_KEY, locale);
  } catch {
  }
  document.documentElement.lang = locale;
  document.documentElement.dir = locale === "ar" ? "rtl" : "ltr";
  listeners.forEach((l) => l());
}

export function useLocale(): Locale {
  return useSyncExternalStore(subscribe, readLocale, () => DEFAULT_LOCALE);
}

export function LocaleSync() {
  const locale = useLocale();
  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === "ar" ? "rtl" : "ltr";
  }, [locale]);
  return null;
}

export type TFunction = (key: MessageKey, vars?: Record<string, string | number>) => string;

export function useT() {
  const locale = useLocale();
  const t: TFunction = useCallback(
    (key, vars) => {
      let text = dictionaries[locale][key] ?? key;
      if (vars) for (const [k, v] of Object.entries(vars)) text = text.replaceAll(`{${k}}`, String(v));
      return text;
    },
    [locale],
  );
  return { t, locale };
}

export function errorText(err: unknown, t: TFunction): string {
  if (err instanceof ApiError) {
    if (err.status === NETWORK_ERROR) return t("error.network");
    if (err.status === 429 && err.retryAfter) return t("error.429", { s: err.retryAfter });
    const coded = `apiError.${err.code}` as MessageKey;
    if (err.code && coded in en) return t(coded);
    if (err.message) return err.message;
    const key = `error.${err.status}` as MessageKey;
    return key in en ? t(key) : t("error.generic");
  }
  return t("error.generic");
}
```

**Line by line:**

- Each line in `en.ts` is `"key": "text"`. The dots in names are only for organizing.
- `{n}` is a placeholder that gets replaced with a value.
- `export type MessageKey = keyof typeof en` creates a type of all the keys. A wrong key becomes a TypeScript error.
- `ar: Record<MessageKey, string>` forces Arabic to have every key.
- `readLocale()` reads the saved language, and `setLocale()` saves it and changes the `lang` and `dir` of the page.
- `useLocale()` gives a component the language.
- `LocaleSync` keeps the `<html>` tag correct.
- `useT()` returns `t`. `t("book.title")` gives the text in the current language, and `.replaceAll` fills the `{n}` values.
- `errorText(err, t)` turns any error into a message a person can read. The code `slot_taken` becomes the key `apiError.slot_taken`.

### Entry 9: Theme, colors and first paint

**Goal:** use Bareeed's exact look.

**File:** `lib/boot.ts`

```ts
export const DEFAULT_LOCALE = "ar";
export const LOCALE_KEY = "alrahma.locale";
export const THEME_KEY = "alrahma.theme";

export const bootScript =
  `try{var l=localStorage.getItem("${LOCALE_KEY}");if(l!=="en"&&l!=="ar")l="${DEFAULT_LOCALE}";document.documentElement.lang=l;document.documentElement.dir=l==="ar"?"rtl":"ltr"}catch(e){}` +
  `try{var t=localStorage.getItem("${THEME_KEY}");if(t!=="dark"&&t!=="light")t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";document.documentElement.classList.toggle("dark",t==="dark")}catch(e){}`;
```

**File:** `lib/theme.ts`

```ts
"use client";

import { useEffect, useSyncExternalStore } from "react";
import { THEME_KEY } from "./boot";

export type Theme = "light" | "dark";

const listeners = new Set<() => void>();

function systemTheme(): Theme {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function readTheme(): Theme {
  try {
    const v = localStorage.getItem(THEME_KEY);
    return v === "dark" || v === "light" ? v : systemTheme();
  } catch {
    return "light";
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setTheme(theme: Theme) {
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
  }
  document.documentElement.classList.toggle("dark", theme === "dark");
  listeners.forEach((l) => l());
}

export function useTheme(): Theme {
  return useSyncExternalStore(subscribe, readTheme, () => "light");
}

export function ThemeSync() {
  const theme = useTheme();
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);
  return null;
}
```

**File:** `lib/view-transition.ts`

```ts
import { flushSync } from "react-dom";

function canAnimate() {
  return (
    typeof document !== "undefined" &&
    "startViewTransition" in document &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export function fadeSwitch(update: () => void) {
  if (!canAnimate()) return update();
  document.documentElement.dataset.vt = "fade";
  const t = document.startViewTransition(() => flushSync(update));
  t.finished.finally(() => delete document.documentElement.dataset.vt);
}

export function circleSwitch(update: () => void, x: number, y: number) {
  if (!canAnimate()) return update();
  document.documentElement.dataset.vt = "circle";
  const t = document.startViewTransition(() => flushSync(update));
  const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
  t.ready.then(() => {
    document.documentElement.animate(
      { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
      { duration: 550, easing: "cubic-bezier(0.22, 1, 0.36, 1)", pseudoElement: "::view-transition-new(root)" },
    );
  });
  t.finished.finally(() => delete document.documentElement.dataset.vt);
}
```

**File:** `app/globals.css` is copied from Bareeed, without the `shadcn` import. It is long, so only the ideas are explained here.

**Line by line:**

- `bootScript` is a tiny script that runs before the page appears. It sets the language and theme right away, so the page never flashes the wrong one. It uses plain text because it runs before React.
- `readTheme()` uses the saved choice. If there is none, it follows the device's setting.
- `setTheme()` saves the choice and adds or removes the `dark` class on `<html>`.
- `ThemeSync` keeps that class correct.
- `circleSwitch` is the circle animation when switching the theme. `fadeSwitch` is the fade when switching language. Both use the browser's View Transitions, and they turn off for people who choose reduced motion.
- In `globals.css`, `--color-brand-*` are the indigo colors, and `.dark { ... }` replaces the colors for night mode.
- `@custom-variant dark` tells Tailwind that dark mode depends on the `dark` class.

### Entry 10: Shared pieces (`components/`)

**Goal:** keep the same buttons, cards and fields everywhere.

**File:** `components/common.tsx`

```tsx
"use client";

import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import type { AppointmentStatus, Medicine } from "@/lib/api/types";
import { STATUS_COLOR } from "@/lib/display";
import { useT, type MessageKey } from "@/lib/i18n";
import { Badge } from "@/components/ui/badge";
import { Button as UIButton, buttonVariants } from "@/components/ui/button";
import { Card as UICard } from "@/components/ui/card";
import { Input as UIInput } from "@/components/ui/input";

export function PageHeader({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <UICard className={cn("block gap-0 p-6 shadow-sm", className)}>{children}</UICard>;
}

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

const VARIANT = { primary: "default", secondary: "outline", ghost: "ghost", danger: "destructive" } as const;

export function buttonClass(variant: ButtonVariant = "secondary", className = "", size: "sm" | "default" = "sm") {
  return cn(buttonVariants({ variant: VARIANT[variant], size }), className);
}

export function Button({
  variant = "primary",
  loading = false,
  className = "",
  children,
  disabled,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; loading?: boolean }) {
  return (
    <UIButton {...props} variant={VARIANT[variant]} disabled={disabled || loading} className={className}>
      {loading && (
        <span className="inline-block size-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden />
      )}
      {children}
    </UIButton>
  );
}

export function Field({ label, error, hint, children }: { label: string; error?: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block space-y-2">
      <span className="block text-sm font-medium text-foreground">{label}</span>
      {children}
      <FieldError error={error} fallback={hint} />
    </label>
  );
}

export function FieldError({ error, fallback }: { error?: string; fallback?: string }) {
  const { t } = useT();
  if (error) return <span className="block text-xs text-destructive">{t(error as MessageKey)}</span>;
  if (fallback) return <span className="block text-xs text-muted-foreground">{fallback}</span>;
  return null;
}

export function Input({ invalid, className = "", ...props }: InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  return <UIInput {...props} aria-invalid={invalid || undefined} className={className} />;
}

export function Textarea({ className = "", ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={cn(
        "min-h-20 w-full rounded-lg border border-input bg-card px-3 py-2 text-base outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-input/30",
        className,
      )}
    />
  );
}

export { Select } from "@/components/select";

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-card px-6 py-16 text-center">
      <p className="font-medium text-foreground">{title}</p>
      {description && <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const { t } = useT();
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 px-6 py-10 text-center" role="alert">
      <p className="font-medium text-red-800">{t("common.loadFailed")}</p>
      <p className="mt-1.5 text-sm text-red-700">{message}</p>
      {onRetry && (
        <Button variant="secondary" className="mt-5" onClick={onRetry}>
          {t("common.retry")}
        </Button>
      )}
    </div>
  );
}

export function StatusBadge({ status }: { status: AppointmentStatus }) {
  const { t } = useT();
  return (
    <Badge variant="secondary" className={cn("h-auto border-transparent", STATUS_COLOR[status])}>
      {t(`status.${status}`)}
    </Badge>
  );
}

export function MedicineList({ medicines }: { medicines: Medicine[] }) {
  const { t } = useT();
  return (
    <ul className="space-y-1 text-sm">
      {medicines.map((m, index) => (
        <li key={index}>{t("visit.medicineLine", { name: m.name, dose: m.dose, days: m.days })}</li>
      ))}
    </ul>
  );
}
```

**Line by line:**

- `PageHeader` is the title and description at the top of each page.
- `Card` wraps the base card and adds spacing.
- `VARIANT` maps our names to the base component's names.
- `buttonClass` gives button styles to a link.
- `Button` adds a `loading` option. It shows a spinner and blocks double clicks, which matters for bookings and payments.
- `Field` joins a label, a field and an error. The `<label>` wrapping makes clicking the label focus the field.
- `FieldError` translates the error key.
- `Textarea` is a large text box, styled like the input.
- `export { Select } from "@/components/select"` passes on the Bareeed dropdown.
- `EmptyState` is the message for an empty list. `ErrorState` shows a failure with a retry button.
- `StatusBadge` shows a colored status. `MedicineList` shows prescription lines.

**File:** `components/logo.tsx`

```tsx
"use client";

import { useId } from "react";
import { useT } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";

export function LogoMark({ size = 32, className = "" }: { size?: number; className?: string }) {
  const id = useId();
  return (
    <svg viewBox="0 0 120 120" width={size} height={size} className={className} aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#6366f1" />
          <stop offset="1" stopColor="#7c3aed" />
        </linearGradient>
      </defs>
      <rect width="120" height="120" rx="28" fill={`url(#${id})`} />
      <path d="M50 28 H70 V50 H92 V70 H70 V92 H50 V70 H28 V50 H50 Z" fill="#fff" />
    </svg>
  );
}

export function Wordmark({ onDark, className = "" }: { onDark?: boolean; className?: string }) {
  const { t } = useT();
  const theme = useTheme();
  onDark ??= theme === "dark";
  const color = onDark ? "text-[#f8fafc]" : "text-[#0f172a]";
  return <span className={`font-extrabold tracking-tight ${color} ${className}`}>{t("app.name")}</span>;
}

export function Logo({ size = 32, onDark, className = "" }: { size?: number; onDark?: boolean; className?: string }) {
  const { t } = useT();
  return (
    <span className={`inline-flex items-center gap-2 ${className}`} aria-label={t("app.name")}>
      <LogoMark size={size} />
      <Wordmark onDark={onDark} />
    </span>
  );
}
```

- `useId()` makes a unique name for the gradient, so two logos on a page do not clash.
- The `<path>` draws the white medical cross.
- `onDark ??= theme === "dark"` picks the text color if nobody passed one.

**File:** `components/account.tsx`

```tsx
"use client";

import Link from "next/link";
import { LanguageSwitch } from "@/components/language-switch";
import { LogoMark, Wordmark } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="absolute top-4 end-4 flex gap-2">
        <ThemeToggle />
        <LanguageSwitch />
      </div>

      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-block">
            <LogoMark size={56} className="mx-auto mb-3 rounded-2xl shadow-lg shadow-brand-600/30" />
            <span className="text-2xl">
              <Wordmark />
            </span>
          </Link>
          <h1 className="mt-4 text-xl font-semibold">{title}</h1>
          <p className="text-sm text-slate-500">{subtitle}</p>
        </div>
        {children}
        {footer && <p className="mt-4 text-center text-sm text-slate-600">{footer}</p>}
      </div>
    </main>
  );
}
```

- `AuthShell` is the shared frame of the login and register pages. `absolute top-4 end-4` puts the buttons in the corner, and `end` works for both directions.

**Copied from Bareeed with no changes:**

| File | What it does |
| --- | --- |
| `components/ui/button.tsx` | The base button and its variants |
| `components/ui/card.tsx` | The base card |
| `components/ui/badge.tsx` | The base badge |
| `components/ui/input.tsx` | The base input |
| `components/select.tsx` | The animated dropdown |
| `components/skeleton.tsx` | Gray loading shapes |
| `components/toaster.tsx` | The popup messages |
| `components/theme-toggle.tsx` | The sun and moon button |
| `components/language-switch.tsx` | The language button |
| `lib/useLoad.ts` | Loads data, with loading and error states |
| `lib/api/errors.ts` | The `ApiError` class |

These are your Bareeed files, so they are not repeated here.

**`useLoad` is worth remembering.** Every page uses it:

```tsx
const { state, reload } = useLoad(api.myAppointments, "", { every: 4000 });
```

- The first value is the function that gets the data.
- `""` is a key. When it changes, the data loads again.
- `{ every: 4000 }` loads again every 4 seconds. This keeps the queue live, for now, until the backend says if it uses WebSocket.
- `state.status` is `"loading"`, `"error"` or `"success"`, so each page shows the right thing.
- `reload()` loads again after an action.

### Entry 11: Page frame and landing page

**File:** `app/layout.tsx`

```tsx
import type { Metadata } from "next";
import { IBM_Plex_Sans_Arabic } from "next/font/google";
import { Toaster } from "@/components/toaster";
import { bootScript, DEFAULT_LOCALE } from "@/lib/boot";
import { LocaleSync } from "@/lib/i18n";
import { ThemeSync } from "@/lib/theme";
import "./globals.css";

const plexArabic = IBM_Plex_Sans_Arabic({
  variable: "--font-plex-arabic",
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "مجمع الرحمة الطبي | Al-Rahma Medical Complex",
  description: "احجز موعدك وتابع دورك وملفك الطبي. Book your visit and follow your turn and medical file.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang={DEFAULT_LOCALE} dir="rtl" className={`${plexArabic.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: bootScript }} />
      </head>
      <body className="min-h-full font-sans">
        <LocaleSync />
        <ThemeSync />
        {children}
        <Toaster />
      </body>
    </html>
  );
}
```

**Line by line:**

- `IBM_Plex_Sans_Arabic` is the same font as Bareeed.
- `<script dangerouslySetInnerHTML={{ __html: bootScript }} />` puts the boot script in the page. The word "dangerous" is a warning about user text. Ours is our own fixed text.
- `suppressHydrationWarning` is needed because the boot script changes `<html>` before React starts.
- `<LocaleSync />` and `<ThemeSync />` show nothing, and only keep settings correct.
- `<Toaster />` is the area for popup messages.

**File:** `app/page.tsx`

```tsx
import { LandingPage } from "@/components/landing/landing-page";

export default function Home() {
  return <LandingPage />;
}
```

This page stays small and only shows the landing component.

**File:** `components/landing/navbar.tsx`

```tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, useMotionValueEvent, useScroll } from "motion/react";
import { LayoutDashboard, LogIn, UserRound } from "lucide-react";
import { homeFor, useIsPatient, useIsStaff, useSession } from "@/lib/auth";
import { useT, type MessageKey } from "@/lib/i18n";
import { LanguageSwitch } from "@/components/language-switch";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";

const LINKS: { href: string; label: MessageKey }[] = [
  { href: "#how", label: "landing.nav.how" },
  { href: "#doctors", label: "landing.nav.doctors" },
];

export function Navbar() {
  const { t } = useT();
  const { session } = useSession();
  const isStaff = useIsStaff();
  const isPatient = useIsPatient();
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);
  useMotionValueEvent(scrollY, "change", (y) => setScrolled(y > 12));

  return (
    <motion.header
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6 }}
      className={`fixed inset-x-0 top-0 z-40 transition-colors duration-300 ${
        scrolled ? "border-b border-slate-200/70 bg-white/85 shadow-sm backdrop-blur-md" : "bg-transparent"
      }`}
    >
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 md:px-8">
        <Link href="/" className="text-xl">
          <Logo size={36} />
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
            >
              {t(l.label)}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <LanguageSwitch />
          <Link
            href={isPatient ? "/account" : "/account/login"}
            aria-label={isPatient ? t("landing.nav.account") : t("landing.nav.customer")}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-brand-700"
          >
            <UserRound className="h-4 w-4" aria-hidden />
            <span className="hidden sm:inline">{isPatient ? t("landing.nav.account") : t("landing.nav.customer")}</span>
          </Link>
          <Link
            href={isStaff && session ? homeFor(session.user.role) : "/login"}
            aria-label={isStaff ? t("landing.nav.dashboard") : t("landing.nav.staff")}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-medium text-slate-50 transition-colors hover:bg-slate-700"
          >
            {isStaff ? (
              <LayoutDashboard className="h-4 w-4" aria-hidden />
            ) : (
              <LogIn className="h-4 w-4 rtl:rotate-180" aria-hidden />
            )}
            <span className="hidden sm:inline">{isStaff ? t("landing.nav.dashboard") : t("landing.nav.staff")}</span>
          </Link>
        </div>
      </nav>
    </motion.header>
  );
}
```

- `useScroll` and `useMotionValueEvent` watch the scrolling. After 12 pixels, the transparent bar gets a background.
- `motion.header` slides the bar in. `initial` is the start, and `animate` is the end.
- `hidden md:flex` hides the links on phones.
- `href={isPatient ? "/account" : "/account/login"}` sends the person to the right place.
- `rtl:rotate-180` flips the arrow in Arabic.

**File:** `components/landing/landing-page.tsx`

```tsx
"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { CalendarCheck, Clock, FileHeart, Stethoscope } from "lucide-react";
import { api } from "@/lib/api";
import { resetMockData } from "@/lib/api/mock";
import { USE_MOCK } from "@/lib/config";
import { doctorBranch, doctorName, doctorSpecialty, money } from "@/lib/display";
import { errorText, useT } from "@/lib/i18n";
import { useLoad } from "@/lib/useLoad";
import { Button, Card, ErrorState, buttonClass } from "@/components/common";
import { CardsSkeleton } from "@/components/skeleton";
import { Navbar } from "./navbar";

const STEPS = [
  { icon: CalendarCheck, title: "landing.how.step1.title", body: "landing.how.step1.body" },
  { icon: Clock, title: "landing.how.step2.title", body: "landing.how.step2.body" },
  { icon: FileHeart, title: "landing.how.step3.title", body: "landing.how.step3.body" },
] as const;

function Hero() {
  const { t } = useT();
  return (
    <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 pt-28 pb-16 md:grid-cols-2 md:px-8 md:pt-36">
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="space-y-6">
        <span className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700">
          <span className="size-2 rounded-full bg-brand-500" aria-hidden />
          {t("landing.hero.eyebrow")}
        </span>
        <h1 className="text-4xl font-bold leading-tight tracking-tight md:text-5xl">
          {t("landing.hero.title1")}
          <span className="block text-brand-600 dark:text-brand-300">{t("landing.hero.title2")}</span>
        </h1>
        <p className="max-w-md text-slate-600">{t("landing.hero.subtitle")}</p>
        <div className="flex flex-wrap gap-3">
          <Link href="/account" className={buttonClass("primary", "h-11 px-5", "default")}>
            <CalendarCheck aria-hidden />
            {t("landing.hero.cta")}
          </Link>
          <a href="#doctors" className={buttonClass("secondary", "h-11 px-5", "default")}>
            <Stethoscope aria-hidden />
            {t("landing.hero.secondary")}
          </a>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, delay: 0.15 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#6366f1] to-[#7c3aed] p-6 shadow-xl shadow-brand-600/30"
      >
        <div className="tape-stripes absolute inset-0" aria-hidden />
        <div className="relative space-y-4 rounded-2xl bg-[#0f172a]/80 p-6 text-[#f8fafc]">
          <p className="text-sm opacity-80">{t("landing.ticket.title")}</p>
          <p className="text-6xl font-bold" dir="ltr">
            A-07
          </p>
          <p className="font-medium">{t("landing.ticket.doctor")}</p>
          <div className="flex items-center justify-between gap-3 rounded-lg bg-white/10 px-3 py-2 text-sm">
            <span>{t("landing.ticket.ahead")}</span>
            <span className="opacity-80">{t("landing.ticket.next")}</span>
          </div>
        </div>
      </motion.div>
    </section>
  );
}

function HowItWorks() {
  const { t } = useT();
  return (
    <section id="how" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-14 md:px-8">
      <h2 className="mb-8 text-center text-2xl font-bold">{t("landing.how.title")}</h2>
      <div className="grid gap-4 md:grid-cols-3">
        {STEPS.map(({ icon: Icon, title, body }, index) => (
          <Card key={title}>
            <span className="mb-4 inline-flex size-10 items-center justify-center rounded-lg bg-brand-100 text-brand-700">
              <Icon className="size-5" aria-hidden />
            </span>
            <h3 className="mb-1 font-semibold">
              {index + 1}. {t(title)}
            </h3>
            <p className="text-sm text-slate-600">{t(body)}</p>
          </Card>
        ))}
      </div>
    </section>
  );
}

function Doctors() {
  const { t, locale } = useT();
  const { state, reload } = useLoad(api.listDoctors);
  return (
    <section id="doctors" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-14 md:px-8">
      <h2 className="mb-8 text-center text-2xl font-bold">{t("landing.doctors.title")}</h2>
      {state.status === "loading" && <CardsSkeleton count={2} />}
      {state.status === "error" && <ErrorState message={errorText(state.error, t)} onRetry={reload} />}
      {state.status === "success" && (
        <div className="grid gap-4 sm:grid-cols-2">
          {state.data.map((d) => (
            <Card key={d.id}>
              <h3 className="font-semibold">{doctorName(d, locale)}</h3>
              <p className="text-sm text-slate-600">
                {doctorSpecialty(d, locale)} · {doctorBranch(d, locale)}
              </p>
              <p className="mt-3 text-sm font-medium text-brand-700">
                {t("common.fee")}: {money(d.fee)} {t("common.currency")}
              </p>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}

export function LandingPage() {
  const { t } = useT();

  function reset() {
    resetMockData();
    window.location.reload();
  }

  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <HowItWorks />
        <Doctors />
        {USE_MOCK && (
          <div className="pb-10 text-center">
            <Button variant="secondary" onClick={reset}>
              {t("landing.reset")}
            </Button>
          </div>
        )}
      </main>
    </>
  );
}
```

- `STEPS` lists the three steps. `as const` keeps the exact key names for TypeScript.
- `Hero` has the text and the turn ticket.
- `bg-gradient-to-br from-[#6366f1] to-[#7c3aed]` is the purple gradient.
- `tape-stripes` sits on its own layer, because one element cannot hold both backgrounds. This was a real bug: the stripes erased the gradient.
- `bg-[#0f172a]/80` is a fixed dark color. A variable like `slate-950` would flip in night mode.
- `Doctors` calls `api.listDoctors`, a public request with no token.
- `{USE_MOCK && ...}` shows the reset button only in mock mode.

### Entry 12: Login and register pages

**File:** `app/login/page.tsx`

```tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { api } from "@/lib/api";
import { MOCK_LOGINS, MOCK_PASSWORD } from "@/lib/api/mock";
import { canUseDashboard, homeFor, saveSession, useSession } from "@/lib/auth";
import { USE_MOCK } from "@/lib/config";
import { errorText, useT } from "@/lib/i18n";
import { loginSchema, type LoginForm } from "@/lib/validation";
import { AuthShell } from "@/components/account";
import { Button, Card, Field, Input } from "@/components/common";

export default function LoginPage() {
  const router = useRouter();
  const { t } = useT();
  const { session } = useSession();
  const [error, setError] = useState("");
  const [isPatient, setIsPatient] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

  useEffect(() => {
    if (session && canUseDashboard(session.user.role)) router.replace(homeFor(session.user.role));
  }, [session, router]);

  async function onSubmit(values: LoginForm) {
    setError("");
    setIsPatient(false);
    try {
      const res = await api.login(values);
      if (!canUseDashboard(res.user.role)) {
        setIsPatient(true);
        setError(t("login.staffOnly"));
        return;
      }
      saveSession({ token: res.access_token, refreshToken: res.refresh_token, user: res.user });
    } catch (err) {
      setError(errorText(err, t));
    }
  }

  return (
    <AuthShell title={t("nav.staff")} subtitle={t("app.subtitle")}>
      <Card>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <Field label={t("login.phone")} error={errors.phone?.message}>
            <Input type="tel" inputMode="numeric" dir="ltr" autoComplete="username" placeholder="07XXXXXXXXX" invalid={!!errors.phone} {...register("phone")} />
          </Field>
          <Field label={t("login.password")} error={errors.password?.message}>
            <Input type="password" dir="ltr" autoComplete="current-password" invalid={!!errors.password} {...register("password")} />
          </Field>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
              {error}
            </p>
          )}
          {isPatient && (
            <Button type="button" variant="secondary" className="w-full" onClick={() => router.replace("/account/login")}>
              {t("login.goPatient")}
            </Button>
          )}

          <Button type="submit" loading={isSubmitting} className="w-full">
            {t("login.submit")}
          </Button>
        </form>
      </Card>

      {USE_MOCK && (
        <div className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-center text-xs text-amber-800">
          <p>{t("login.mockHint")}</p>
          <p dir="ltr">
            {t("nav.reception")} {MOCK_LOGINS.reception} · {t("nav.doctor")} {MOCK_LOGINS.doctor} · {t("nav.pharmacy")} {MOCK_LOGINS.pharmacy}
          </p>
          <p dir="ltr">{MOCK_PASSWORD}</p>
        </div>
      )}
    </AuthShell>
  );
}
```

**File:** `app/account/login/page.tsx`

```tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { api } from "@/lib/api";
import { MOCK_LOGINS, MOCK_PASSWORD } from "@/lib/api/mock";
import { saveSession, useIsPatient } from "@/lib/auth";
import { USE_MOCK } from "@/lib/config";
import { errorText, useT } from "@/lib/i18n";
import { loginSchema, type LoginForm } from "@/lib/validation";
import { AuthShell } from "@/components/account";
import { Button, Card, Field, Input } from "@/components/common";

export default function PatientLoginPage() {
  const router = useRouter();
  const { t } = useT();
  const isPatient = useIsPatient();
  const [error, setError] = useState("");
  const [isStaff, setIsStaff] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

  useEffect(() => {
    if (isPatient) router.replace("/account");
  }, [isPatient, router]);

  async function onSubmit(values: LoginForm) {
    setError("");
    setIsStaff(false);
    try {
      const res = await api.login(values);
      if (res.user.role !== "patient") {
        setIsStaff(true);
        setError(t("account.login.patientsOnly"));
        return;
      }
      saveSession({ token: res.access_token, refreshToken: res.refresh_token, user: res.user });
    } catch (err) {
      setError(errorText(err, t));
    }
  }

  return (
    <AuthShell
      title={t("account.login.title")}
      subtitle={t("account.login.subtitle")}
      footer={
        <>
          {t("account.login.noAccount")}{" "}
          <Link href="/account/register" className="font-medium text-brand-600 hover:underline">
            {t("account.login.register")}
          </Link>
        </>
      }
    >
      <Card>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <Field label={t("login.phone")} error={errors.phone?.message}>
            <Input type="tel" inputMode="numeric" dir="ltr" autoComplete="username" placeholder="07XXXXXXXXX" invalid={!!errors.phone} {...register("phone")} />
          </Field>
          <Field label={t("login.password")} error={errors.password?.message}>
            <Input type="password" dir="ltr" autoComplete="current-password" invalid={!!errors.password} {...register("password")} />
          </Field>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
              {error}
            </p>
          )}
          {isStaff && (
            <Button type="button" variant="secondary" className="w-full" onClick={() => router.replace("/login")}>
              {t("account.login.goStaff")}
            </Button>
          )}

          <Button type="submit" loading={isSubmitting} className="h-11 w-full">
            {t("login.submit")}
          </Button>
        </form>
      </Card>

      {USE_MOCK && (
        <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-center text-xs text-amber-800">
          {t("login.mockHint")}{" "}
          <span dir="ltr">
            {MOCK_LOGINS.patient} / {MOCK_PASSWORD}
          </span>
        </p>
      )}
    </AuthShell>
  );
}
```

**File:** `app/account/register/page.tsx`

```tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { api } from "@/lib/api";
import { saveSession, useIsPatient } from "@/lib/auth";
import { errorText, useT } from "@/lib/i18n";
import { registerSchema, type RegisterForm } from "@/lib/validation";
import { AuthShell } from "@/components/account";
import { Button, Card, Field, Input } from "@/components/common";

export default function RegisterPage() {
  const router = useRouter();
  const { t } = useT();
  const isPatient = useIsPatient();
  const [error, setError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>({ resolver: zodResolver(registerSchema) });

  useEffect(() => {
    if (isPatient) router.replace("/account");
  }, [isPatient, router]);

  async function onSubmit(values: RegisterForm) {
    setError("");
    try {
      const res = await api.register(values);
      saveSession({ token: res.access_token, refreshToken: res.refresh_token, user: res.user });
    } catch (err) {
      setError(errorText(err, t));
    }
  }

  return (
    <AuthShell
      title={t("account.register.title")}
      subtitle={t("account.register.subtitle")}
      footer={
        <>
          {t("account.register.hasAccount")}{" "}
          <Link href="/account/login" className="font-medium text-brand-600 hover:underline">
            {t("account.register.login")}
          </Link>
        </>
      }
    >
      <Card>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <Field label={t("account.register.name")} error={errors.name?.message}>
            <Input autoComplete="name" invalid={!!errors.name} {...register("name")} />
          </Field>
          <Field label={t("login.phone")} error={errors.phone?.message}>
            <Input type="tel" inputMode="numeric" dir="ltr" autoComplete="username" placeholder="07XXXXXXXXX" invalid={!!errors.phone} {...register("phone")} />
          </Field>
          <Field label={t("login.password")} error={errors.password?.message}>
            <Input type="password" dir="ltr" autoComplete="new-password" invalid={!!errors.password} {...register("password")} />
          </Field>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
              {error}
            </p>
          )}

          <Button type="submit" loading={isSubmitting} className="h-11 w-full">
            {t("account.register.submit")}
          </Button>
        </form>
      </Card>
    </AuthShell>
  );
}
```

**Line by line:**

- `useForm<LoginForm>({ resolver: zodResolver(loginSchema) })` connects the form to our rules.
- `register` connects an input to the form.
- `handleSubmit(onSubmit)` checks the rules first, and runs `onSubmit` only if they pass.
- `formState: { errors, isSubmitting }` gives the errors and the loading state.
- `useEffect` sends a logged-in person to their own page.
- `await api.login(values)` calls the API, and `try/catch` handles failure.
- `canUseDashboard(res.user.role)` stops a patient from using the staff login.
- `saveSession(...)` stores the token, and the `useEffect` then moves the page.
- `noValidate` turns off the browser's messages, so ours appear in the right language.
- `{USE_MOCK && ...}` shows the fake accounts only in mock mode.

### Entry 13: Patient area (`app/account/`)

**File:** `app/account/layout.tsx`

```tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { CalendarClock, CalendarPlus, FileHeart } from "lucide-react";
import { api } from "@/lib/api";
import { clearSession, useSession } from "@/lib/auth";
import { USE_MOCK } from "@/lib/config";
import { useT, type MessageKey } from "@/lib/i18n";
import { LanguageSwitch } from "@/components/language-switch";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Skeleton } from "@/components/skeleton";
import { buttonClass } from "@/components/common";

const NAV: { href: string; label: MessageKey; icon: typeof CalendarPlus }[] = [
  { href: "/account", label: "account.nav.book", icon: CalendarPlus },
  { href: "/account/appointments", label: "account.nav.appointments", icon: CalendarClock },
  { href: "/account/records", label: "account.nav.records", icon: FileHeart },
];

const PUBLIC = ["/account/login", "/account/register"];

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useT();
  const { session, ready } = useSession();
  const isPublic = PUBLIC.includes(pathname);
  const allowed = session?.user.role === "patient";
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (!isPublic && ready && !allowed) router.replace("/account/login");
  }, [isPublic, ready, allowed, router]);

  if (isPublic) return children;

  if (!ready || !allowed || leaving) {
    return (
      <div className="mx-auto max-w-5xl space-y-4 px-4 py-8">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  function logout() {
    setLeaving(true);
    void api.logout();
    clearSession();
    // A full reload clears any patient data left in the browser's memory.
    window.location.replace("/");
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-3 px-4">
          <div className="flex items-center gap-2">
            <Link href="/" className="text-lg">
              <Logo size={32} />
            </Link>
            {USE_MOCK && (
              <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">{t("app.mockBadge")}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <LanguageSwitch />
            <button onClick={logout} className={buttonClass("danger")}>
              {t("nav.logout")}
            </button>
          </div>
        </div>

        <nav className="mx-auto flex max-w-5xl gap-1 overflow-x-auto scrollbar-thin px-4 pb-2">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                replace
                className={`inline-flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium ${
                  active ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <Icon className="size-4" aria-hidden />
                {t(label)}
              </Link>
            );
          })}
        </nav>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 md:py-8">{children}</main>
    </div>
  );
}
```

**Line by line:**

- `PUBLIC` lists the pages that need no login.
- `usePathname()` gives the current address.
- `allowed` is true only for a patient.
- `useEffect` redirects anyone else to the login page.
- `if (isPublic) return children` shows login and register with no patient header.
- The `Skeleton` return shows a loading shape while checking.
- `logout()` uses `window.location.replace`, a full reload. It clears patient data from the browser's memory, which matters on shared computers.
- `icon: Icon` renames the value, because a component must start with a capital letter.

**File:** `app/account/page.tsx`, booking

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { api, type Day, type Doctor } from "@/lib/api";
import { doctorBranch, doctorName, doctorSpecialty, money } from "@/lib/display";
import { errorText, useT } from "@/lib/i18n";
import { useLoad } from "@/lib/useLoad";
import { Button, Card, EmptyState, ErrorState, Field, PageHeader, Select } from "@/components/common";
import { FormSkeleton, Skeleton } from "@/components/skeleton";

const DAYS: Day[] = ["today", "tomorrow"];

function SlotPicker({ doctorId, day, time, onPick }: { doctorId: number; day: Day; time: string; onPick: (time: string) => void }) {
  const { t } = useT();
  const { state, reload } = useLoad(() => api.doctorSlots(doctorId, day), `${doctorId}|${day}`, { every: 4000 });

  if (state.status === "loading") return <Skeleton className="h-24 w-full" />;
  if (state.status === "error") return <ErrorState message={errorText(state.error, t)} onRetry={reload} />;
  if (!state.data.some((s) => s.available)) return <EmptyState title={t("book.noSlots")} />;

  return (
    <div className="grid grid-cols-3 gap-2">
      {state.data.map((slot) => (
        <Button
          key={slot.time}
          type="button"
          dir="ltr"
          className="h-11"
          variant={slot.time === time ? "primary" : "secondary"}
          disabled={!slot.available}
          onClick={() => onPick(slot.time)}
        >
          {slot.time}
        </Button>
      ))}
    </div>
  );
}

function BookingForm({ doctors, family }: { doctors: Doctor[]; family: { id: number; name: string }[] }) {
  const router = useRouter();
  const { t, locale } = useT();
  const [patientId, setPatientId] = useState(family[0].id);
  const [doctorId, setDoctorId] = useState(doctors[0].id);
  const [day, setDay] = useState<Day>("today");
  const [time, setTime] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function confirm() {
    setError("");
    setSaving(true);
    try {
      await api.book({ patient_id: patientId, doctor_id: doctorId, day, time });
      toast.success(t("book.done"));
      router.replace("/account/appointments");
    } catch (err) {
      setError(errorText(err, t));
      setTime("");
      setSaving(false);
    }
  }

  return (
    <Card className="space-y-5">
      <Field label={t("book.for")}>
        <Select value={patientId} onChange={(e) => setPatientId(Number(e.target.value))}>
          {family.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </Select>
      </Field>

      <div className="space-y-2">
        <p className="text-sm font-medium">{t("book.doctor")}</p>
        {doctors.map((d) => (
          <button
            key={d.id}
            type="button"
            onClick={() => {
              setDoctorId(d.id);
              setTime("");
            }}
            className={`w-full rounded-lg border p-3 text-start transition-colors ${
              d.id === doctorId ? "border-brand-500 bg-brand-50" : "border-slate-200 bg-white hover:bg-slate-50"
            }`}
          >
            <span className="block font-semibold">{doctorName(d, locale)}</span>
            <span className="block text-sm text-slate-600">
              {doctorSpecialty(d, locale)} · {doctorBranch(d, locale)} · {money(d.fee)} {t("common.currency")}
            </span>
          </button>
        ))}
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">{t("book.day")}</p>
        <div className="grid grid-cols-2 gap-2">
          {DAYS.map((item) => (
            <Button
              key={item}
              type="button"
              className="h-11"
              variant={item === day ? "primary" : "secondary"}
              onClick={() => {
                setDay(item);
                setTime("");
              }}
            >
              {t(`day.${item}`)}
            </Button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">{t("book.time")}</p>
        <SlotPicker doctorId={doctorId} day={day} time={time} onPick={setTime} />
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}

      <Button className="h-11 w-full" disabled={!time} loading={saving} onClick={confirm}>
        {t("book.confirm")}
      </Button>
    </Card>
  );
}

export default function BookPage() {
  const { t } = useT();
  const { state, reload } = useLoad(() => Promise.all([api.listDoctors(), api.myFamily()]));

  return (
    <>
      <PageHeader title={t("book.title")} description={t("book.subtitle")} />
      {state.status === "loading" && <FormSkeleton />}
      {state.status === "error" && <ErrorState message={errorText(state.error, t)} onRetry={reload} />}
      {state.status === "success" && <BookingForm doctors={state.data[0]} family={state.data[1]} />}
    </>
  );
}
```

**Line by line:**

- `SlotPicker` loads the free times, and refreshes every 4 seconds. Its key `` `${doctorId}|${day}` `` reloads the times when the doctor or day changes.
- `disabled={!slot.available}` blocks taken times.
- `BookingForm` receives data that has already loaded, so `family[0]` is safe.
- `confirm()` books. On failure, it shows the error and clears the time, because that time is gone.
- `toast.success(...)` shows the popup message.
- `Promise.all([...])` waits for doctors and family together.
- `{state.status === "loading" && ...}` shows one state at a time. Every page repeats this pattern.

**File:** `app/account/appointments/page.tsx`

```tsx
"use client";

import Link from "next/link";
import { toast } from "sonner";
import { api, type MyAppointment } from "@/lib/api";
import { doctorName } from "@/lib/display";
import { errorText, useT } from "@/lib/i18n";
import { useLoad } from "@/lib/useLoad";
import { Button, Card, EmptyState, ErrorState, PageHeader, StatusBadge, buttonClass } from "@/components/common";
import { CardsSkeleton } from "@/components/skeleton";

function TurnText({ appointment }: { appointment: MyAppointment }) {
  const { t } = useT();
  if (appointment.status === "in_progress") return <>{t("appointments.withDoctor")}</>;
  if (appointment.ahead === 0) return <>{t("appointments.yourTurn")}</>;
  return <>{t("appointments.ahead", { n: appointment.ahead ?? 0 })}</>;
}

export default function AppointmentsPage() {
  const { t, locale } = useT();
  const { state, reload } = useLoad(api.myAppointments, "", { every: 4000 });

  async function cancel(id: number) {
    try {
      await api.cancelAppointment(id);
      toast.success(t("appointments.cancelled"));
      reload();
    } catch (err) {
      toast.error(errorText(err, t));
    }
  }

  return (
    <>
      <PageHeader title={t("appointments.title")} description={t("appointments.subtitle")} />
      {state.status === "loading" && <CardsSkeleton count={2} />}
      {state.status === "error" && <ErrorState message={errorText(state.error, t)} onRetry={reload} />}
      {state.status === "success" && state.data.length === 0 && (
        <div className="space-y-4 text-center">
          <EmptyState title={t("appointments.empty")} description={t("appointments.emptyHint")} />
          <Link href="/account" replace className={buttonClass("primary", "h-11 px-5", "default")}>
            {t("appointments.bookNow")}
          </Link>
        </div>
      )}
      {state.status === "success" && (
        <div className="space-y-3">
          {state.data.map((a) => (
            <Card key={a.id} className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-semibold">{doctorName(a.doctor, locale)}</h2>
                <StatusBadge status={a.status} />
              </div>
              <p className="text-sm text-slate-600">
                {a.patient_name} · {t(`day.${a.day}`)} · <span dir="ltr">{a.time}</span>
              </p>
              {a.ahead !== null && (
                <p className="rounded-lg bg-brand-50 px-3 py-2 text-lg font-bold text-brand-700">
                  <TurnText appointment={a} />
                </p>
              )}
              {a.status === "booked" && (
                <Button variant="danger" onClick={() => cancel(a.id)}>
                  {t("appointments.cancel")}
                </Button>
              )}
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
```

- `TurnText` picks the right sentence for the patient's turn.
- `{ every: 4000 }` keeps the turn number live.
- `a.ahead !== null` shows the turn box only when the patient is in the queue.
- `{a.status === "booked" && ...}` allows cancelling only before arrival.

**File:** `app/account/records/page.tsx`

```tsx
"use client";

import { api } from "@/lib/api";
import { doctorName } from "@/lib/display";
import { errorText, useT } from "@/lib/i18n";
import { useLoad } from "@/lib/useLoad";
import { Card, EmptyState, ErrorState, MedicineList, PageHeader } from "@/components/common";
import { CardsSkeleton } from "@/components/skeleton";

export default function RecordsPage() {
  const { t, locale } = useT();
  const { state, reload } = useLoad(api.myVisits);

  return (
    <>
      <PageHeader title={t("records.title")} description={t("records.subtitle")} />
      {state.status === "loading" && <CardsSkeleton count={2} />}
      {state.status === "error" && <ErrorState message={errorText(state.error, t)} onRetry={reload} />}
      {state.status === "success" && state.data.length === 0 && (
        <EmptyState title={t("records.empty")} description={t("records.emptyHint")} />
      )}
      {state.status === "success" && (
        <div className="space-y-3">
          {state.data.map((v) => (
            <Card key={v.id} className="space-y-2">
              <h2 className="font-semibold">
                {v.patient_name} · {doctorName(v.doctor, locale)}
              </h2>
              <p className="text-sm">
                <span className="text-slate-500">{t("visit.diagnosis")}: </span>
                {v.diagnosis}
              </p>
              <h3 className="text-sm font-medium">{t("visit.prescription")}</h3>
              {v.medicines.length === 0 ? (
                <p className="text-sm text-slate-500">{t("visit.noMedicines")}</p>
              ) : (
                <MedicineList medicines={v.medicines} />
              )}
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
```

- The type `PatientVisit` has no internal note, so this page cannot show one.

### Entry 14: Staff dashboard (`app/(dashboard)/`)

**What are the brackets?** A folder like `(dashboard)` is a route group. It shares a layout, but is not in the address. So the page is `/doctor`, not `/dashboard/doctor`.

**File:** `app/(dashboard)/layout.tsx`

```tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { canUseDashboard, clearSession, homeFor, useSession } from "@/lib/auth";
import { USE_MOCK } from "@/lib/config";
import { useT, type MessageKey } from "@/lib/i18n";
import { LanguageSwitch } from "@/components/language-switch";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Skeleton } from "@/components/skeleton";
import { buttonClass } from "@/components/common";

const ROLE_LABEL = {
  reception: "nav.reception",
  doctor: "nav.doctor",
  pharmacy: "nav.pharmacy",
} as const satisfies Record<string, MessageKey>;

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useT();
  const { session, ready } = useSession();
  const home = session && canUseDashboard(session.user.role) ? homeFor(session.user.role) : null;
  const allowed = home === pathname;
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (ready && !allowed) router.replace(home ?? "/login");
  }, [ready, allowed, home, router]);

  if (!ready || leaving || !allowed || !session || session.user.role === "patient") {
    return (
      <div className="flex min-h-screen">
        <Skeleton className="hidden h-screen w-60 rounded-none md:block" />
        <div className="flex-1 space-y-4 p-8">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-80" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  function logout() {
    setLeaving(true);
    void api.logout();
    clearSession();
    // A full reload clears any patient data left in the browser's memory.
    window.location.replace("/login");
  }

  const label = ROLE_LABEL[session.user.role];

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="border-b border-slate-200 bg-white md:sticky md:top-0 md:flex md:h-screen md:w-60 md:shrink-0 md:flex-col md:border-b-0 md:border-e">
        <div className="flex items-center justify-between gap-2 px-4 py-4 md:px-5">
          <Link href="/" className="text-lg">
            <Logo size={32} />
          </Link>
          {USE_MOCK && (
            <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">
              {t("app.mockBadge")}
            </span>
          )}
        </div>

        <nav className="flex gap-1 overflow-x-auto scrollbar-thin px-2 pb-2 md:flex-col md:px-3">
          <span className="whitespace-nowrap rounded-lg bg-brand-50 px-3 py-2 text-sm font-medium text-brand-700">
            {t(label)}
          </span>
        </nav>

        <div className="mt-auto hidden border-t border-slate-200 px-5 py-4 md:block">
          <p className="truncate text-sm font-medium">{session.user.name}</p>
          <p className="text-xs text-slate-500">{t(label)}</p>
          <div className="mt-3 flex items-center justify-between gap-2">
            <button onClick={logout} className={buttonClass("danger")}>
              {t("nav.logout")}
            </button>
            <div className="flex gap-2">
              <ThemeToggle />
              <LanguageSwitch />
            </div>
          </div>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-end gap-3 border-b border-slate-200 bg-white px-4 py-2 text-sm md:hidden">
          <span className="text-slate-600">{session.user.name}</span>
          <ThemeToggle />
          <LanguageSwitch />
          <button onClick={logout} className="text-red-600">
            {t("nav.logout")}
          </button>
        </div>
        <main className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-8">{children}</main>
      </div>
    </div>
  );
}
```

**Line by line:**

- `ROLE_LABEL` gives each role its label. `satisfies` checks the keys are real.
- `home` is this person's only allowed page.
- `allowed = home === pathname` keeps the doctor out of the pharmacy page.
- `router.replace(home ?? "/login")` sends a person back to their page, or to login.
- `<aside>` is the sidebar. `md:` classes apply from tablet width, and on phones it becomes a top bar.

**File:** `app/(dashboard)/reception/page.tsx`

```tsx
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { api, type Doctor } from "@/lib/api";
import { doctorName } from "@/lib/display";
import { errorText, useT } from "@/lib/i18n";
import { useLoad } from "@/lib/useLoad";
import { walkInSchema, type WalkInForm } from "@/lib/validation";
import { Button, Card, EmptyState, ErrorState, Field, Input, PageHeader, Select, StatusBadge } from "@/components/common";
import { CardsSkeleton, FormSkeleton } from "@/components/skeleton";

function QueueCard({ doctor, version }: { doctor: Doctor; version: number }) {
  const { t, locale } = useT();
  const { state, reload } = useLoad(() => api.doctorQueue(doctor.id), `${doctor.id}|${version}`, { every: 4000 });

  return (
    <Card className="space-y-3">
      <h2 className="font-semibold">
        {t("queue.title")}: {doctorName(doctor, locale)}
      </h2>
      {state.status === "loading" && <CardsSkeleton count={1} />}
      {state.status === "error" && <ErrorState message={errorText(state.error, t)} onRetry={reload} />}
      {state.status === "success" && state.data.length === 0 && <p className="text-sm text-slate-500">{t("queue.empty")}</p>}
      {state.status === "success" && (
        <ol className="space-y-2">
          {state.data.map((a, index) => (
            <li key={a.id} className="flex items-center justify-between gap-2 text-sm">
              <span>
                {index + 1}. {a.patient_name}
              </span>
              {a.emergency ? (
                <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">{t("queue.emergency")}</span>
              ) : (
                <StatusBadge status={a.status} />
              )}
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}

function WalkInCard({ doctors, onAdded }: { doctors: Doctor[]; onAdded: () => void }) {
  const { t, locale } = useT();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<WalkInForm>({
    resolver: zodResolver(walkInSchema),
    defaultValues: { name: "", phone: "", doctor_id: String(doctors[0].id), emergency: false },
  });

  async function onSubmit(values: WalkInForm) {
    try {
      const { duplicate } = await api.addWalkIn({
        name: values.name,
        phone: values.phone,
        doctor_id: Number(values.doctor_id),
        emergency: values.emergency,
      });
      if (duplicate) toast.info(t("reception.duplicate"));
      else toast.success(t("reception.added"));
      reset();
      onAdded();
    } catch (err) {
      toast.error(errorText(err, t));
    }
  }

  return (
    <Card>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <h2 className="font-semibold">{t("reception.walkIn")}</h2>
        <Field label={t("reception.name")} error={errors.name?.message}>
          <Input invalid={!!errors.name} {...register("name")} />
        </Field>
        <Field label={t("login.phone")} error={errors.phone?.message}>
          <Input type="tel" inputMode="numeric" dir="ltr" placeholder="07XXXXXXXXX" invalid={!!errors.phone} {...register("phone")} />
        </Field>
        <Field label={t("reception.doctor")}>
          <Select {...register("doctor_id")}>
            {doctors.map((d) => (
              <option key={d.id} value={d.id}>
                {doctorName(d, locale)}
              </option>
            ))}
          </Select>
        </Field>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" className="size-4 accent-brand-600" {...register("emergency")} />
          {t("reception.emergency")}
        </label>
        <Button type="submit" loading={isSubmitting} className="w-full">
          {t("reception.add")}
        </Button>
      </form>
    </Card>
  );
}

export default function ReceptionPage() {
  const { t, locale } = useT();
  const doctors = useLoad(api.listDoctors);
  const booked = useLoad(api.bookedToday, "", { every: 4000 });
  const version = booked.updatedAt ?? 0;

  async function checkIn(id: number, emergency: boolean) {
    try {
      await api.checkIn(id, emergency);
      toast.success(t("reception.checkedIn"));
      booked.reload();
    } catch (err) {
      toast.error(errorText(err, t));
    }
  }

  return (
    <>
      <PageHeader title={t("reception.title")} description={t("reception.subtitle")} />
      {doctors.state.status === "loading" && <FormSkeleton />}
      {doctors.state.status === "error" && <ErrorState message={errorText(doctors.state.error, t)} onRetry={doctors.reload} />}
      {doctors.state.status === "success" && (
        <div className="grid items-start gap-4 lg:grid-cols-2">
          <div className="space-y-4">
            <Card className="space-y-3">
              <h2 className="font-semibold">{t("reception.today")}</h2>
              {booked.state.status === "loading" && <CardsSkeleton count={1} />}
              {booked.state.status === "error" && <ErrorState message={errorText(booked.state.error, t)} onRetry={booked.reload} />}
              {booked.state.status === "success" && booked.state.data.length === 0 && <EmptyState title={t("reception.empty")} />}
              {booked.state.status === "success" &&
                booked.state.data.map((a) => {
                  const doctor = doctors.state.status === "success" ? doctors.state.data.find((d) => d.id === a.doctor_id) : undefined;
                  return (
                    <div key={a.id} data-appointment={a.time} className="space-y-2 border-t border-slate-200 pt-3">
                      <p className="text-sm">
                        <span className="font-semibold">{a.patient_name}</span>
                        {doctor && ` · ${doctorName(doctor, locale)}`} · <span dir="ltr">{a.time}</span>
                      </p>
                      <div className="flex gap-2">
                        <Button onClick={() => checkIn(a.id, false)}>{t("reception.checkIn")}</Button>
                        <Button variant="danger" onClick={() => checkIn(a.id, true)}>
                          {t("reception.emergency")}
                        </Button>
                      </div>
                    </div>
                  );
                })}
            </Card>
            <WalkInCard doctors={doctors.state.data} onAdded={booked.reload} />
          </div>
          <div className="space-y-4">
            {doctors.state.data.map((d) => (
              <QueueCard key={d.id} doctor={d} version={version} />
            ))}
          </div>
        </div>
      )}
    </>
  );
}
```

**Line by line:**

- `QueueCard` shows one doctor's queue. `version` reloads it after check-in.
- `WalkInCard` is the form. `defaultValues` gives the starting values.
- `doctor_id: String(doctors[0].id)` is text because HTML values are text, and `Number(...)` changes it back before sending.
- `reset()` clears the form.
- `data-appointment={a.time}` is a marker that helps automated tests find a row.
- Reception never calls a diagnosis function, so it never receives one.

**File:** `app/(dashboard)/doctor/page.tsx`

```tsx
"use client";

import { useState } from "react";
import { toast } from "sonner";
import { api, type Medicine, type StaffAppointment } from "@/lib/api";
import { useSession } from "@/lib/auth";
import { errorText, useT } from "@/lib/i18n";
import { useLoad } from "@/lib/useLoad";
import { Button, Card, EmptyState, ErrorState, Field, Input, MedicineList, PageHeader, StatusBadge, Textarea } from "@/components/common";
import { CardsSkeleton } from "@/components/skeleton";

function History({ patientId }: { patientId: number }) {
  const { t } = useT();
  const { state, reload } = useLoad(() => api.patientHistory(patientId), String(patientId));

  if (state.status === "loading") return <CardsSkeleton count={1} />;
  if (state.status === "error") return <ErrorState message={errorText(state.error, t)} onRetry={reload} />;
  if (state.data.length === 0) return <p className="text-sm text-slate-500">{t("doctor.noHistory")}</p>;
  return (
    <div className="space-y-2">
      {state.data.map((v) => (
        <div key={v.id} className="rounded-lg bg-brand-50 p-3 text-sm">
          <p>
            {t("visit.diagnosis")}: {v.diagnosis}
          </p>
          {v.internal_note && <p className="text-slate-600">{v.internal_note}</p>}
        </div>
      ))}
    </div>
  );
}

function VisitForm({ appointment, onDone }: { appointment: StaffAppointment; onDone: () => void }) {
  const { t } = useT();
  const [diagnosis, setDiagnosis] = useState("");
  const [note, setNote] = useState("");
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [medicine, setMedicine] = useState<Medicine>({ name: "", dose: "", days: 1 });
  const [saving, setSaving] = useState(false);

  function addMedicine() {
    setMedicines([...medicines, { ...medicine, name: medicine.name.trim() }]);
    setMedicine({ name: "", dose: "", days: 1 });
  }

  async function finish() {
    setSaving(true);
    try {
      await api.finishVisit(appointment.id, { diagnosis: diagnosis.trim(), internal_note: note.trim(), medicines });
      toast.success(t("doctor.finished"));
      onDone();
    } catch (err) {
      toast.error(errorText(err, t));
      setSaving(false);
    }
  }

  return (
    <Card className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">{appointment.patient_name}</h2>
        <StatusBadge status={appointment.status} />
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-medium">{t("doctor.history")}</h3>
        <History patientId={appointment.patient_id} />
      </div>

      <Field label={t("visit.diagnosis")}>
        <Textarea value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} />
      </Field>
      <Field label={t("doctor.internalNote")}>
        <Textarea value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>

      <div className="space-y-3">
        <h3 className="text-sm font-medium">{t("visit.prescription")}</h3>
        <MedicineList medicines={medicines} />
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label={t("doctor.medicine")}>
            <Input dir="ltr" value={medicine.name} onChange={(e) => setMedicine({ ...medicine, name: e.target.value })} />
          </Field>
          <Field label={t("doctor.dose")}>
            <Input dir="ltr" value={medicine.dose} onChange={(e) => setMedicine({ ...medicine, dose: e.target.value })} />
          </Field>
          <Field label={t("doctor.days")}>
            <Input type="number" min={1} value={medicine.days} onChange={(e) => setMedicine({ ...medicine, days: Number(e.target.value) })} />
          </Field>
        </div>
        <Button variant="secondary" disabled={!medicine.name.trim()} onClick={addMedicine}>
          {t("doctor.addMedicine")}
        </Button>
      </div>

      <Button className="h-11 w-full" disabled={!diagnosis.trim()} loading={saving} onClick={finish}>
        {t("doctor.finish")}
      </Button>
    </Card>
  );
}

export default function DoctorPage() {
  const { t } = useT();
  const { session } = useSession();
  const doctorId = session?.user.doctor_id ?? 0;
  const { state, reload } = useLoad(() => api.doctorQueue(doctorId), String(doctorId), { every: 4000 });

  async function callNext(id: number) {
    try {
      await api.startVisit(id);
      reload();
    } catch (err) {
      toast.error(errorText(err, t));
    }
  }

  const current = state.status === "success" ? state.data.find((a) => a.status === "in_progress") : undefined;
  const waiting = state.status === "success" ? state.data.filter((a) => a.status === "arrived") : [];

  return (
    <>
      <PageHeader title={t("doctor.title")} description={t("doctor.subtitle")} />
      {state.status === "loading" && <CardsSkeleton count={2} />}
      {state.status === "error" && <ErrorState message={errorText(state.error, t)} onRetry={reload} />}
      {state.status === "success" && (
        <div className="grid items-start gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            {current ? (
              <VisitForm key={current.id} appointment={current} onDone={reload} />
            ) : (
              <EmptyState title={t("doctor.noCurrent")} description={t("doctor.noCurrentHint")} />
            )}
          </div>
          <Card className="space-y-3">
            <h2 className="font-semibold">{t("queue.title")}</h2>
            {waiting.length === 0 && <p className="text-sm text-slate-500">{t("queue.empty")}</p>}
            <ol className="space-y-2">
              {waiting.map((a, index) => (
                <li key={a.id} className="flex items-center justify-between gap-2 text-sm">
                  <span>
                    {index + 1}. {a.patient_name}
                  </span>
                  {a.emergency && (
                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">{t("queue.emergency")}</span>
                  )}
                </li>
              ))}
            </ol>
            {!current && waiting.length > 0 && (
              <Button className="w-full" onClick={() => callNext(waiting[0].id)}>
                {t("doctor.callNext")}
              </Button>
            )}
          </Card>
        </div>
      )}
    </>
  );
}
```

**Line by line:**

- `History` loads the patient's whole file. The doctor can see the internal note here.
- `VisitForm` holds the visit fields with `useState`.
- `key={current.id}` creates a fresh form for each patient, so one patient's text can never appear on the next file.
- `session?.user.doctor_id` gives this doctor's own queue, from the login.
- `{!current && waiting.length > 0 && ...}` shows "Call next" only when the room is free.

**File:** `app/(dashboard)/pharmacy/page.tsx`

```tsx
"use client";

import { toast } from "sonner";
import { api, type Prescription } from "@/lib/api";
import { errorText, useT } from "@/lib/i18n";
import { useLoad } from "@/lib/useLoad";
import { Button, Card, EmptyState, ErrorState, MedicineList, PageHeader } from "@/components/common";
import { CardsSkeleton } from "@/components/skeleton";

function PrescriptionCard({ prescription, onDispense }: { prescription: Prescription; onDispense: (id: number) => void }) {
  const { t } = useT();
  return (
    <Card className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-semibold">{prescription.patient_name}</h3>
        {prescription.dispensed && (
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">{t("pharmacy.dispensed")}</span>
        )}
      </div>
      <MedicineList medicines={prescription.medicines} />
      {!prescription.dispensed && (
        <Button className="w-full" onClick={() => onDispense(prescription.id)}>
          {t("pharmacy.dispense")}
        </Button>
      )}
    </Card>
  );
}

export default function PharmacyPage() {
  const { t } = useT();
  const { state, reload } = useLoad(api.listPrescriptions, "", { every: 4000 });

  async function dispense(id: number) {
    try {
      await api.dispense(id);
      toast.success(t("pharmacy.done"));
      reload();
    } catch (err) {
      toast.error(errorText(err, t));
    }
  }

  const waiting = state.status === "success" ? state.data.filter((p) => !p.dispensed) : [];
  const dispensed = state.status === "success" ? state.data.filter((p) => p.dispensed) : [];

  return (
    <>
      <PageHeader title={t("pharmacy.title")} description={t("pharmacy.subtitle")} />
      {state.status === "loading" && <CardsSkeleton count={2} />}
      {state.status === "error" && <ErrorState message={errorText(state.error, t)} onRetry={reload} />}
      {state.status === "success" && (
        <div className="grid items-start gap-6 lg:grid-cols-2">
          <section className="space-y-3">
            <h2 className="font-semibold">{t("pharmacy.waiting")}</h2>
            {waiting.length === 0 && <EmptyState title={t("pharmacy.noWaiting")} />}
            {waiting.map((p) => (
              <PrescriptionCard key={p.id} prescription={p} onDispense={dispense} />
            ))}
          </section>
          <section className="space-y-3">
            <h2 className="font-semibold">{t("pharmacy.dispensed")}</h2>
            {dispensed.length === 0 && <EmptyState title={t("pharmacy.noDispensed")} />}
            {dispensed.map((p) => (
              <PrescriptionCard key={p.id} prescription={p} onDispense={dispense} />
            ))}
          </section>
        </div>
      )}
    </>
  );
}
```

- `PrescriptionCard` receives `onDispense` from the page. Passing a function as a prop lets a child call the parent.
- `{!prescription.dispensed && ...}` removes the button after dispensing.

### Entry 15: The config change (`next.config.ts`)

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
```

- The new template had `cacheComponents` and `partialPrefetching` turned on. Bareeed does not use them.
- They are for server pages, but ours are browser pages. They caused console errors, and kept old pages hidden in the browser.
- We removed both.
- `turbopack.rules` lets the build process our Tailwind CSS.

### Entry 16: Testing

**Commands, all passed:**

```bash
npm run lint
npx tsc --noEmit
npm run build
```

- `npx tsc --noEmit` checks all the TypeScript without creating files.

**Automated browser tests:**

- **Mock on:** the full flow ran at phone size: login, booking, reception, queue, doctor, pharmacy and medical file.
- **Mock off:** a fake backend proved the interceptor, the token refresh and the error message when the API is down.
- **Double booking:** two tabs chose the same time. Only one booking was saved, and the second tab showed the refusal message.
- **Permissions:** guests go to login, and a patient cannot open a staff page.
- **Privacy:** the patient cannot see the internal note, and the pharmacy cannot see the diagnosis or note.
- **Console:** there were no console errors.

**Not built yet:** lab, accountant, manager, reports, online payment, notifications, the log of who opened a file, no-show rules, cancellation time limits, prescription expiry and offline mode.

### Results

| Screen | Screenshot |
| --- | --- |
| Landing page | `screenshots/01-home.png` |
| Staff login | `screenshots/02-staff-login.png` |
| Booking | `screenshots/03-patient-booking.png` |
| Reception | `screenshots/04-reception.png` |
| Patient queue | `screenshots/05-patient-queue.png` |
| Doctor visit | `screenshots/06-doctor-visit.png` |
| Pharmacy | `screenshots/07-pharmacy.png` |
| Medical file | `screenshots/08-patient-file.png` |
| English and night mode | `screenshots/09-english-dark.png` |
| Dashboard on desktop | `screenshots/10-dashboard-desktop.png` |
